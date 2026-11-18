import axios from 'axios'
import request from '@/utils/request'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/store/user'
import { pinia } from '@/store'

export function info () {
  return request({
    url: '/download/info',
    method: 'get',
  })
}

// Baixa o executável com o token do usuário logado (o interceptor padrão
// espera JSON, então aqui o pedido é feito direto, como blob).
export async function baixar (tipo, nome) {
  const userStore = useUserStore(pinia)
  const token = userStore.token || getToken()
  const res = await axios.get(`${import.meta.env.VITE_SERVER_API}/download/arquivo/${tipo}`, {
    responseType: 'blob',
    headers: { 'api-token': token },
    timeout: 10 * 60 * 1000,
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
