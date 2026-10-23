import { app } from './app.js'
import { config } from './config.js'

app.listen(config.port, () => {
  console.log(`[server] Katoto API on http://localhost:${config.port} (${config.isProduction ? 'production' : 'development'})`)
})
