import request from '@/utils/request'

export function collections () {
  return request({
    url: '/my/shared/collections',
    method: 'get',
  })
}

export function addressBooks (params) {
  return request({
    url: '/my/shared/address_book',
    method: 'get',
    params,
  })
}
