import { config } from './src/config/index.js'
import app from './src/server.js'

app.listen(config.port, () => console.log(`Server running on port ${config.port}`))
