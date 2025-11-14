<<<<<<< HEAD
import { InventoryBatch } from '@prisma/client';
import { inventoryRepository } from '@/repositories/inventory.repository';
import { productRepository } from '@/repositories/product.repository';
=======
import { prisma } from '@/lib/prisma';
import { inventoryRepository } from '@/repositories/inventory.repository';
import { productService } from '@/services/product.service';
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
import {
  AddStockInput,
  DeductStockInput,
  TransferStockInput,
<<<<<<< HEAD
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

=======
  BatchWithRelations,
  MovementWithRelations,
  BatchFilters,
  MovementFilters,
  WeightedAverageCostResult,
  StockLevel,
} from '@/types/inventory.types';
import { ValidationError, NotFoundError, InsufficientStockError } from '@/lib/errors';

export class InventoryService {
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
  /**
   * Generate a unique batch number in format: BATCH-YYYYMMDD-XXXX
   */
  async generateBatchNumber(): Promise<string> {
<<<<<<< HEAD
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
=======
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Find the last batch number for today
    const lastBatch = await prisma.inventoryBatch.findFirst({
      where: {
        batchNumber: {
          startsWith: `BATCH-${dateStr}`,
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
        },
      },
      orderBy: {
        batchNumber: 'desc',
      },
    });

    let sequence = 1;
<<<<<<< HEAD
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
=======
    if (lastBatch) {
      const lastSequence = parseInt(lastBatch.batchNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `BATCH-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Calculate weighted average cost for a product in a warehouse
   * Formula: (sum of quantity × unitCost) / (sum of quantity)
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
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

<<<<<<< HEAD
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
=======
  /**
   * Get detailed weighted average cost information
   */
  async getWeightedAverageCostDetails(
    productId: string,
    warehouseId: string
  ): Promise<WeightedAverageCostResult> {
    const batches = await inventoryRepository.findActiveBatches(productId, warehouseId);

    const totalCost = batches.reduce(
      (sum, batch) => sum + Number(batch.quantity) * Number(batch.unitCost),
      0
    );
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3

    const totalQuantity = batches.reduce(
      (sum, batch) => sum + Number(batch.quantity),
      0
    );

<<<<<<< HEAD
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
=======
    const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    return {
      productId,
      warehouseId,
      averageCost,
      totalQuantity,
      totalValue: totalCost,
    };
  }

  /**
   * Convert quantity from any UOM to base UOM
   */
  async convertToBaseUOM(
    productId: string,
    quantity: number,
    uom: string
  ): Promise<number> {
    const product = await productService.getProductById(productId);

    // If already base UOM, return as-is
    if (uom.toLowerCase() === product.baseUOM.toLowerCase()) {
      return quantity;
    }

    // Find the alternate UOM
    const alternateUOM = product.alternateUOMs.find(
      (u) => u.name.toLowerCase() === uom.toLowerCase()
    );

    if (!alternateUOM) {
      throw new ValidationError(`UOM '${uom}' not found for product ${product.name}`, {
        uom: 'Invalid UOM for this product',
      });
    }

    // Convert: quantity × conversionFactor = base units
    return quantity * Number(alternateUOM.conversionFactor);
  }

  /**
   * Add stock to inventory
   */
  async addStock(data: AddStockInput): Promise<BatchWithRelations> {
    // Validate product exists
    const product = await productService.getProductById(data.productId);
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3

    // Convert quantity to base UOM
    const baseQuantity = await this.convertToBaseUOM(
      data.productId,
      data.quantity,
      data.uom
    );

<<<<<<< HEAD
=======
    // Validate quantity
    if (baseQuantity <= 0) {
      throw new ValidationError('Quantity must be greater than zero', {
        quantity: 'Invalid quantity',
      });
    }

    // Validate unit cost
    if (data.unitCost <= 0) {
      throw new ValidationError('Unit cost must be greater than zero', {
        unitCost: 'Invalid unit cost',
      });
    }

>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
    // Generate batch number
    const batchNumber = await this.generateBatchNumber();

    // Calculate expiry date
<<<<<<< HEAD
    const receivedDate = new Date();
=======
    const receivedDate = data.receivedDate || new Date();
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
    const expiryDate = new Date(receivedDate);
    expiryDate.setDate(expiryDate.getDate() + product.shelfLifeDays);

    // Create batch and movement in a transaction
<<<<<<< HEAD
    return await prisma.$transaction(async (tx) => {
=======
    const result = await prisma.$transaction(async (tx) => {
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
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
<<<<<<< HEAD
=======
        include: {
          product: true,
          warehouse: true,
        },
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
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
<<<<<<< HEAD
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
=======

    return result;
  }

  /**
   * Deduct stock from inventory using FIFO (First Expiry, First Out)
   */
  async deductStock(data: DeductStockInput): Promise<void> {
    // Validate product exists
    await productService.getProductById(data.productId);
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3

    // Convert quantity to base UOM
    const baseQuantity = await this.convertToBaseUOM(
      data.productId,
      data.quantity,
      data.uom
    );

<<<<<<< HEAD
=======
    // Validate quantity
    if (baseQuantity <= 0) {
      throw new ValidationError('Quantity must be greater than zero', {
        quantity: 'Invalid quantity',
      });
    }

>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
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
<<<<<<< HEAD
=======
      const product = await productService.getProductById(data.productId);
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
      throw new InsufficientStockError(
        product.name,
        totalAvailable,
        baseQuantity
      );
    }

<<<<<<< HEAD
    // Deduct from batches using FIFO in a transaction
=======
    // Deduct from batches in transaction
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
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
<<<<<<< HEAD
            status: newQuantity === 0 ? 'depleted' : batch.status,
          },
        });

        // Record movement
=======
            status: newQuantity === 0 ? 'depleted' : 'active',
          },
        });

        // Record stock movement
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
        await tx.stockMovement.create({
          data: {
            batchId: batch.id,
            type: 'OUT',
            quantity: deductFromBatch,
<<<<<<< HEAD
            reason: data.reason || 'Stock deduction',
=======
            reason: data.reason,
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
            referenceId: data.referenceId,
            referenceType: data.referenceType,
          },
        });

        remainingToDeduct -= deductFromBatch;
      }
    });
  }

<<<<<<< HEAD
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

=======
  /**
   * Transfer stock between warehouses
   */
  async transferStock(data: TransferStockInput): Promise<void> {
    // Validate warehouses are different
    if (data.sourceWarehouseId === data.destinationWarehouseId) {
      throw new ValidationError('Source and destination warehouses must be different', {
        warehouse: 'Cannot transfer to the same warehouse',
      });
    }

    // Validate product exists
    const product = await productService.getProductById(data.productId);

>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
    // Convert quantity to base UOM
    const baseQuantity = await this.convertToBaseUOM(
      data.productId,
      data.quantity,
      data.uom
    );

<<<<<<< HEAD
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

=======
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
    // Get weighted average cost from source warehouse for the new batch
    const avgCost = await this.calculateWeightedAverageCost(
      data.productId,
      data.sourceWarehouseId
    );

<<<<<<< HEAD
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
=======
    if (avgCost === 0) {
      throw new ValidationError('No stock available in source warehouse', {
        warehouse: 'Source warehouse has no stock',
      });
    }

    // Perform transfer in transaction
    await prisma.$transaction(async (tx) => {
      // Deduct from source warehouse
      await this.deductStock({
        productId: data.productId,
        warehouseId: data.sourceWarehouseId,
        quantity: data.quantity,
        uom: data.uom,
        referenceType: 'TRANSFER',
        reason: data.reason || `Transfer to destination warehouse`,
      });

      // Add to destination warehouse
      await this.addStock({
        productId: data.productId,
        warehouseId: data.destinationWarehouseId,
        quantity: data.quantity,
        uom: data.uom,
        unitCost: avgCost,
        referenceType: 'TRANSFER',
        reason: data.reason || `Transfer from source warehouse`,
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
      });
    });
  }

<<<<<<< HEAD
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
=======
  /**
   * Get all inventory batches with filters
   */
  async getAllBatches(filters?: BatchFilters): Promise<BatchWithRelations[]> {
    return await inventoryRepository.findAllBatches(filters);
  }

  /**
   * Get batch by ID
   */
  async getBatchById(id: string): Promise<BatchWithRelations> {
    const batch = await inventoryRepository.findBatchById(id);
    if (!batch) {
      throw new NotFoundError('Inventory batch');
    }
    return batch;
  }

  /**
   * Get all stock movements with filters
   */
  async getAllMovements(filters?: MovementFilters): Promise<MovementWithRelations[]> {
    return await inventoryRepository.findAllMovements(filters);
  }

  /**
   * Get current stock levels with weighted average costs
   */
  async getStockLevels(warehouseId?: string): Promise<StockLevel[]> {
    const groupedStock = await inventoryRepository.getStockLevels(warehouseId);

    const stockLevels: StockLevel[] = [];

    for (const group of groupedStock) {
      const product = await productService.getProductById(group.productId);
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: group.warehouseId },
      });

      if (!warehouse) continue;

      const avgCost = await this.calculateWeightedAverageCost(
        group.productId,
        group.warehouseId
      );

      const quantity = Number(group._sum.quantity || 0);

      stockLevels.push({
        productId: group.productId,
        productName: product.name,
        warehouseId: group.warehouseId,
        warehouseName: warehouse.name,
        quantity,
        weightedAverageCost: avgCost,
        totalValue: quantity * avgCost,
      });
    }

    return stockLevels;
  }

  /**
   * Get total stock for a product across all warehouses
   */
  async getTotalStockForProduct(productId: string): Promise<number> {
    const batches = await prisma.inventoryBatch.findMany({
      where: {
        productId,
        status: 'active',
      },
    });

    return batches.reduce((sum, batch) => sum + Number(batch.quantity), 0);
  }

  /**
   * Check if product has sufficient stock in warehouse
   */
  async hasSufficientStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    uom: string
  ): Promise<boolean> {
    const baseQuantity = await this.convertToBaseUOM(productId, quantity, uom);
    const totalStock = await inventoryRepository.getTotalStock(productId, warehouseId);
    return totalStock >= baseQuantity;
  }

  /**
   * Update batch status (e.g., mark as expired)
   */
  async updateBatchStatus(
    batchId: string,
    status: 'active' | 'expired' | 'depleted'
  ): Promise<void> {
    await inventoryRepository.updateBatch(batchId, { status });
  }

  /**
   * Mark expired batches
   */
  async markExpiredBatches(): Promise<number> {
    const expiredBatches = await prisma.inventoryBatch.findMany({
      where: {
        status: 'active',
        expiryDate: {
          lt: new Date(),
        },
      },
    });

    for (const batch of expiredBatches) {
      await this.updateBatchStatus(batch.id, 'expired');
    }

    return expiredBatches.length;
>>>>>>> 6985753057f50888854ad885e94b8e2e15e01df3
  }
}

export const inventoryService = new InventoryService();
