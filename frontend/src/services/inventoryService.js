import apiImpl from './api/inventoryService.js'
import mockImpl from './mock/inventoryService.js'

const isMock = import.meta.env.VITE_DATA_SOURCE === 'mock'
export const inventoryService = isMock ? mockImpl : apiImpl
export default inventoryService
