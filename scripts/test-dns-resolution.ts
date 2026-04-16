const dns = require('dns')
const https = require('https')
const net = require('net')

async function testDNSAndConnectivity() {
  console.log('Testing DNS resolution and connectivity...')

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.log('DATABASE_URL is not set.')
    process.exit(1)
  }

  const hostname = new URL(databaseUrl).hostname

  console.log(`Testing DNS resolution for ${hostname}...`)

  dns.lookup(hostname, (error: Error | null, address: string, family: number) => {
    if (error) {
      console.log('DNS lookup failed:', error.message)

      const request = https.request(
        {
          hostname,
          port: 443,
          path: '/',
          method: 'GET',
          timeout: 5000,
        },
        (response: { statusCode?: number }) => {
          console.log(`HTTPS connection successful. Status: ${response.statusCode}`)
        },
      )

      request.on('error', (requestError: Error) => {
        console.log('HTTPS connection failed:', requestError.message)
      })

      request.on('timeout', () => {
        console.log('HTTPS connection timed out')
        request.destroy()
      })

      request.end()
      return
    }

    console.log(`DNS resolution successful. IP Address: ${address}, Family: IPv${family}`)
    testPort(hostname, 5432)
  })
}

function testPort(hostname: string, port: number) {
  const socket = new net.Socket()

  socket.setTimeout(5000)

  socket.connect(port, hostname, () => {
    console.log(`Port ${port} is reachable.`)
    socket.destroy()
  })

  socket.on('timeout', () => {
    console.log(`Connection to port ${port} timed out.`)
    socket.destroy()
  })

  socket.on('error', (error: Error) => {
    console.log(`Connection to port ${port} failed: ${error.message}`)
  })

  socket.on('close', () => {
    console.log('Connection closed.')
  })
}

testDNSAndConnectivity()
