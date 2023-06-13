export const generateToken = (len: number): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for(let i = 0; i < len; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}