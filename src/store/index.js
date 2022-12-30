import { configureStore } from '@reduxjs/toolkit'

import backgroundReducer from './feature/background'

export default configureStore({
  reducer: {
    background: backgroundReducer,
  },
})