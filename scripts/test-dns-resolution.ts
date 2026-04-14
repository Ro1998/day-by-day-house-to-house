const dns = require('dns');
const https = require('https');

async function testDNSAndConnectivity() {
  console.log('🔍 Testing DNS resolution and connectivity...');
  
  const hostname = 'db.fuhhnfdbepnxwjcgzdpg.supabase.co';
  
  // Test DNS resolution
  console.log(`\n1. Testing DNS resolution for ${hostname}...`);
  
  dns.lookup(hostname, (err, address, family) => {
    if (err) {
      console.log('❌ DNS lookup failed:', err.message);
      
      // Try alternative hostname formats
      console.log('\n2. Trying alternative approaches...');
      
      // Try with https request (some services respond to https)
      const options = {
        hostname: hostname,
        port: 443,
        path: '/',
        method: 'GET',
        timeout: 5000
      };
      
      const req = https.request(options, (res) => {
        console.log(`✅ HTTPS connection successful! Status: ${res.statusCode}`);
        console.log('This means the hostname is valid, but the PostgreSQL port might be blocked.');
      });
      
      req.on('error', (e) => {
        console.log('❌ HTTPS connection also failed:', e.message);
        console.log('\n🔧 Possible issues:');
        console.log('1. Supabase project is paused/inactive');
        console.log('2. Wrong hostname from dashboard');
        console.log('3. Network connectivity issues');
        console.log('4. Firewall blocking connections');
      });
      
      req.on('timeout', () => {
        console.log('❌ HTTPS connection timed out');
        req.destroy();
      });
      
      req.end();
      
    } else {
      console.log(`✅ DNS resolution successful!`);
      console.log(`   IP Address: ${address}`);
      console.log(`   Family: IPv${family}`);
      
      // Now try to test port 5432
      console.log('\n2. Testing PostgreSQL port 5432...');
      testPort(hostname, 5432);
    }
  });
}

function testPort(hostname, port) {
  const net = require('net');
  
  const socket = new net.Socket();
  
  socket.setTimeout(5000);
  
  socket.connect(port, hostname, function() {
    console.log(`✅ Port ${port} is reachable!`);
    console.log('The connection issue might be with Prisma or authentication.');
    socket.destroy();
  });
  
  socket.on('timeout', function() {
    console.log(`❌ Connection to port ${port} timed out`);
    socket.destroy();
  });
  
  socket.on('error', function(err) {
    console.log(`❌ Connection to port ${port} failed:`, err.message);
    console.log('\n🔧 This suggests:');
    console.log('1. PostgreSQL service is not running on that port');
    console.log('2. Firewall is blocking the connection');
    console.log('3. Supabase database is paused');
  });
  
  socket.on('close', function() {
    console.log('Connection closed');
  });
}

testDNSAndConnectivity();
