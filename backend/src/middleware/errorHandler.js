export function errorHandler(err, req, res, _next) {
  console.error('Unhandled error:', err)
  const status = err.status || err.statusCode || 500
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  res.status(status).json({ error: message })
}
