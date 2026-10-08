import apiImpl from './api/saleService.js'
import mockImpl from './mock/saleService.js'

const isMock = import.meta.env.VITE_DATA_SOURCE === 'mock'
export const saleService = isMock ? mockImpl : apiImpl
export default saleService
