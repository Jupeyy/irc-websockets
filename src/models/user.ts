export interface IUserRow {
  ID: number,
  username: string,
  password: string,
  register_ip: string,
  login_ip: string,
  created_at: string,
  updated_at: string,
  is_admin: number,
  blocked: number
}
