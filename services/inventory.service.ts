import { InventoryBatch } from '@prisma/client';
import { inventoryRepository } from '@/repositories/inventory.repository';
import { productRepository } from '@/repositories/product.repository';
import {
  AddStockInput,
  DeductStockInput,
  TransferStockInput,
  InventoryBatchFilters,
  StockMovementFilters,
  InventoryBatchWithRelations,
  StockMovementWithRelations,
  StockLevel,
} from '@/types/inventory.types';
import { ValidationError, NotFoundError, InsufficientStockError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

export class InventoryService {
  // ==================== Batch Number Generation ====================

  /**
   * Generate a unique batch number in format: BATCH-YYYYMMDD-XXXX
   */
  async generateBatchNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Find the highest sequence number for today
    const prefix = `BATCH-${dateStr}-`;
    const latestBatch = await prisma.inventoryBatch.findFirst({
      where: {
        batchNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        batchNumber: 'desc',
      },
    });

    let sequence = 1;
    if (latestBatch) {
      const lastSequence = latestBatch.batchNumber.split('-')[2];
      sequence = parseInt(lastSequence, 10) + 1;
    }

    const sequenceStr = String(sequence).padStart(4, '0');
    return `${prefix}${sequenceStr}`;
  }

  // ==================== Query Operations ====================

  async getAllBatches(filters?: InventoryBatchFilters): Promise<InventoryBatchWithRelations[]> {
    return await inventoryRepository.findAllBatches(filters);
  }

  async getBatchById(id: string): Promise<InventoryBatchWithRelations> {
    const batch = await inventoryRepository.findBatchById(id);
    if (!batch) {
      throw new NotFoundError('Inventory batch');
    }
    return batch;
  }

  async getAllMovements(filters?: StockMovementFilters): Promise<StockMovementWithRelations[]> {
    return await inventoryRepository.findAllMovements(filters);
  }

  async getMovementById(id: string): Promise<StockMovementWithRelations> {
    const movement = await inventoryRepository.findMovementById(id);
    if (!movement) {
      throw new NotFoundError('Stock movement');
    }
    return movement;
  }

  // ==================== UOM Conversion ====================

  /**
   * Convert quantity from any UOM to base UOM
   */
  async convertToBaseUOM(
    productId: string,
    quantity: number,
    uom: string
  ): Promise<number> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError('Product');
    }

    // If already base UOM, return as is
    if (uom.toLowerCase() === product.baseUOM.toLowerCase()) {
      return quantity;
    }

    // Find conversion factor from alternate UOMs
    const alternateUOM = product.alternateUOMs.find(
      (u) => u.name.toLowerCase() === uom.toLowerCase()
    );

    if (!alternateUOM) {
      throw new ValidationError(`UOM '${uom}' not found for product`, {
        uom: 'Invalid UOM for this product',
      });
    }

    // Convert: quantity * conversionFactor = base units
    return quantity * Number(alternateUOM.conversionFactor);
  }

  // ==================== Weighted Average Cost Calculation ====================

  /**
   * Calculate weighted average cost for a product in a warehouse
   */
  async calculateWeightedAverageCost(
    productId: string,
    warehouseId: string
  ): Promise<number> {
    const batches = await inventoryRepository.findActiveBatches(productId, warehouseId);

    if (batches.length === 0) {
      return 0;
    }

    const totalCost = batches.reduce(
      (sum, batch) => sum + Number(batch.quantity) * Number(batch.unitCost),
      0
    );

    const totalQuantity = batches.reduce(
      (sum, batch) => sum + Number(batch.quantity),
      0
    );

    return totalQuantity > 0 ? totalCost / totalQuantity : 0;
  }

  // ==================== Stock Level Queries ====================

  async getStockLevel(
    productId: string,
    warehouseId: string
  ): Promise<StockLevel | null> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError('Product');
    }

    const batches = await inventoryRepository.findActiveBatches(productId, warehouseId);

    if (batches.length === 0) {
      return null;
    }

    const totalQuantity = batches.reduce(
      (sum, batch) => sum + Number(batch.quantity),
      0
    );

    const weightedAverageCost = await this.calculateWeightedAverageCost(
      productId,
      warehouseId
    );

    // Get warehouse info from first batch
    const warehouseInfo = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { name: true },
    });

    return {
      productId: product.id,
      productName: product.name,
      warehouseId,
      warehouseName: warehouseInfo?.name || '',
      totalQuantity,
      baseUOM: product.baseUOM,
      weightedAverageCost,
      batches: batches.map((batch) => ({
        batchNumber: batch.batchNumber,
        quantity: Number(batch.quantity),
        unitCost: Number(batch.unitCost),
        expiryDate: batch.expiryDate,
        status: batch.status,
      })),
    };
  }

  async getTotalStock(productId: string, warehouseId?: string): Promise<number> {
    return await inventoryRepository.getTotalStockByProduct(productId, warehouseId);
  }

  /**
   * Get current stock level for a product in a warehouse (in base UOM)
   */
  async getCurrentStockLevel(productId: string, warehouseId: string): Promise<number> {
    const batches = await inventoryRepository.findActiveBatches(productId, warehouseId);
    
    return batches.reduce((sum, batch) => sum + Number(batch.quantity), 0);
  }

  // ==================== Add Stock ====================

  /**
   * Add stock to inventory (creates a new batch)
   */
  async addStock(data: AddStockInput): Promise<InventoryBatch> {
    // Validate product exists
    const product = await productRepository.findById(data.productId);
    if (!product) {
      throw new NotFoundError('Product');
    }

    // Validate warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundError('Warehouse');
    }

    // Validate quantity and unit cost
    if (data.quantity <= 0) {
      throw new ValidationError('Invalid quantity', {
        quantity: 'Quantity must be greater than zero',
      });
    }

    if (data.unitCost <= 0) {
      throw new ValidationError('Invalid unit cost', {
        unitCost: 'Unit cost must be greater than zero',
      });
    }

    // Convert quantity to base UOM
    const baseQuantity = await this.convertToBaseUOM(
      data.productId,
      data.quantity,
      data.uom
    );

    // Generate batch number
    const batchNumber = await this.generateBatchNumber();

    // Calculate expiry date
    const receivedDate = new Date();
    const expiryDate = new Date(receivedDate);
    expiryDate.setDate(expiryDate.getDate() + product.shelfLifeDays);

    // Create batch and movement in a transaction
    return await prisma.$transaction(async (tx) => {
      // Create inventory batch
      const batch = await tx.inventoryBatch.create({
        data: {
          batchNumber,
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: baseQuantity,
          unitCost: data.unitCost,
          receivedDate,
          expiryDate,
          status: 'active',
        },
      });

      // Record stock movement
      await tx.stockMovement.create({
        data: {
          batchId: batch.id,
          type: 'IN',
          quantity: baseQuantity,
          reason: data.reason || 'Stock addition',
          referenceId: data.referenceId,
          referenceType: data.referenceType,
        },
      });

      return batch;
    });
  }

  // ==================== Deduct Stock ====================

  /**
   * Deduct stock from inventory using FIFO (First In, First Out based on expiry date)
   */
  async deductStock(data: DeductStockInput): Promise<void> {
    // Validate product exists
    const product = await productRepository.findById(data.productId);
    if (!product) {
      throw new NotFoundError('Product');
    }

    // Validate quantity
    if (data.quantity <= 0) {
      throw new ValidationError('Invalid quantity', {
        quantity: 'Quantity must be greater than zero',
      });
    }

    // Convert quantity to base UOM
    const baseQuantity = await this.convertToBaseUOM(
      data.productId,
      data.quantity,
      data.uom
    );

    // Get active batches ordered by expiry date (FIFO)
    const batches = await inventoryRepository.findActiveBatches(
      data.productId,
      data.warehouseId
    );

    // Check if sufficient stock is available
    const totalAvailable = batches.reduce(
      (sum, batch) => sum + Number(batch.quantity),
      0
    );

    if (totalAvailable < baseQuantity) {
      throw new InsufficientStockError(
        product.name,
        totalAvailable,
        baseQuantity
      );
    }

    // Deduct from batches using FIFO in a transaction
    await prisma.$transaction(async (tx) => {
      let remainingToDeduct = baseQuantity;

      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;

        const batchQuantity = Number(batch.quantity);
        const deductFromBatch = Math.min(batchQuantity, remainingToDeduct);

        // Update batch quantity
        const newQuantity = batchQuantity - deductFromBatch;
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            quantity: newQuantity,
            status: newQuantity === 0 ? 'depleted' : batch.status,
          },
        });

        // Record movement
        await tx.stockMovement.create({
          data: {
            batchId: batch.id,
            type: 'OUT',
            quantity: deductFromBatch,
            reason: data.reason || 'Stock deduction',
            referenceId: data.referenceId,
            referenceType: data.referenceType,
          },
        });

        remainingToDeduct -= deductFromBatch;
      }
    });
  }

  // ==================== Transfer Stock ====================

  /**
   * Transfer stock between warehouses
   * Deducts from source warehouse and adds to destination warehouse in a single transaction
   */
  async transferStock(data: TransferStockInput): Promise<void> {
    // Validate product exists
    const product = await productRepository.findById(data.productId);
    if (!product) {
      throw new NotFoundError('Product');
    }

    // Validate warehouses exist
    const sourceWarehouse = await prisma.warehouse.findUnique({
      where: { id: data.sourceWarehouseId },
    });
    if (!sourceWarehouse) {
      throw new NotFoundError('Source warehouse');
    }

    const destWarehouse = await prisma.warehouse.findUnique({
      where: { id: data.destinationWarehouseId },
    });
    if (!destWarehouse) {
      throw new NotFoundError('Destination warehouse');
    }

    // Validate quantity
    if (data.quantity <= 0) {
      throw new ValidationError('Invalid quantity', {
        quantity: 'Quantity must be greater than zero',
      });
    }

    // Convert quantity to base UOM
    const baseQuantity = await this.convertToBaseUOM(
      data.productId,
      data.quantity,
      data.uom
    );

    // Get active batches from source warehouse ordered by expiry date (FIFO)
    const sourceBatches = await inventoryRepository.findActiveBatches(
      data.productId,
      data.sourceWarehouseId
    );

    // Check if sufficient stock is available in source warehouse
    const totalAvailable = sourceBatches.reduce(
      (sum, batch) => sum + Number(batch.quantity),
      0
    );

    if (totalAvailable < baseQuantity) {
      throw new InsufficientStockError(
        product.name,
        totalAvailable,
        baseQuantity
      );
    }

    // Get weighted average cost from source warehouse for the new batch
    const avgCost = await this.calculateWeightedAverageCost(
      data.productId,
      data.sourceWarehouseId
    );

    // Perform transfer in a single atomic transaction
    await prisma.$transaction(async (tx) => {
      // Step 1: Deduct from source warehouse using FIFO
      let remainingToDeduct = baseQuantity;

      for (const batch of sourceBatches) {
        if (remainingToDeduct <= 0) break;

        const batchQuantity = Number(batch.quantity);
        const deductFromBatch = Math.min(batchQuantity, remainingToDeduct);

        // Update batch quantity
        const newQuantity = batchQuantity - deductFromBatch;
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            quantity: newQuantity,
            status: newQuantity === 0 ? 'depleted' : batch.status,
          },
        });

        // Record movement for source warehouse
        await tx.stockMovement.create({
          data: {
            batchId: batch.id,
            type: 'TRANSFER',
            quantity: deductFromBatch,
            reason: data.reason || `Transfer to ${destWarehouse.name}`,
          },
        });

        remainingToDeduct -= deductFromBatch;
      }

      // Step 2: Add to destination warehouse as a new batch
      // Generate batch number
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;
      const prefix = `BATCH-${dateStr}-`;
      
      // Find the highest sequence number for today
      const latestBatch = await tx.inventoryBatch.findFirst({
        where: {
          batchNumber: {
            startsWith: prefix,
          },
        },
        orderBy: {
          batchNumber: 'desc',
        },
      });

      let sequence = 1;
      if (latestBatch) {
        const lastSequence = latestBatch.batchNumber.split('-')[2];
        sequence = parseInt(lastSequence, 10) + 1;
      }

      const sequenceStr = String(sequence).padStart(4, '0');
      const batchNumber = `${prefix}${sequenceStr}`;

      // Calculate expiry date
      const receivedDate = new Date();
      const expiryDate = new Date(receivedDate);
      expiryDate.setDate(expiryDate.getDate() + product.shelfLifeDays);

      // Create new batch in destination warehouse
      const newBatch = await tx.inventoryBatch.create({
        data: {
          batchNumber,
          productId: data.productId,
          warehouseId: data.destinationWarehouseId,
          quantity: baseQuantity,
          unitCost: avgCost,
          receivedDate,
          expiryDate,
          status: 'active',
        },
      });

      // Record movement for destination warehouse
      await tx.stockMovement.create({
        data: {
          batchId: newBatch.id,
          type: 'TRANSFER',
          quantity: baseQuantity,
          reason: data.reason || `Transfer from ${sourceWarehouse.name}`,
        },
      });
    });
  }

  // ==================== Expiry Management ====================

  async getExpiringBatches(daysUntilExpiry: number = 30): Promise<InventoryBatchWithRelations[]> {
    return await inventoryRepository.getExpiringBatches(daysUntilExpiry);
  }

  async getExpiredBatches(): Promise<InventoryBatchWithRelations[]> {
    return await inventoryRepository.getExpiredBatches();
  }

  /**
   * Mark expired batches as expired
   */
  async markExpiredBatches(): Promise<number> {
    const expiredBatches = await this.getExpiredBatches();
    
    let count = 0;
    for (const batch of expiredBatches) {
      await inventoryRepository.updateBatchStatus(batch.id, 'expired');
      count++;
    }

    return count;
  }
}

export const inventoryService = new InventoryService();
