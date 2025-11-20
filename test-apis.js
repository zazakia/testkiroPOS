// Test API endpoints to see actual error messages
async function testAPIs() {
  console.log('Testing API endpoints...\n');

  // Test 1: Products API
  console.log('1. Testing /api/products?status=active');
  try {
    const res = await fetch('http://localhost:3000/api/products?status=active');
    const data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.log(`   Error:`, err.message);
  }

  console.log('\n2. Testing /api/products (no params)');
  try {
    const res = await fetch('http://localhost:3000/api/products');
    const data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.log(`   Error:`, err.message);
  }

  console.log('\n3. Testing /api/purchase-orders');
  try {
    const res = await fetch('http://localhost:3000/api/purchase-orders?');
    const data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.log(`   Error:`, err.message);
  }
}

testAPIs().catch(console.error);
