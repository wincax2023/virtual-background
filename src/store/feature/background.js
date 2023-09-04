import { createSlice } from '@reduxjs/toolkit'

export const backgroundSlice = createSlice({
  name: 'background',
  initialState: {
    background:  {
        type: 'none', // none | blur | custom | image
        image: '',
        blurRadius: 12,
        selectIndex: 0,
        isUploadImage: false,
        api: '',
        value: '',
        apiClear: 'BackgroundTexture.clear',
    }, // 虚拟背景
    watermark: {
      image: '',
      position: 1,
      value: '',
      type: 'none', // none | image
      selectIndex: 0,
    }
  },
  reducers: {
    setBackground(state, action) {
        let background = action.payload;
        return { ...state, background };
    },
    setWatermark(state, action) {
      let watermark = action.payload;
      return { ...state, watermark };
  },
  },
})

// Action creators are generated for each case reducer function
export const { setBackground, setWatermark } = backgroundSlice.actions

export default backgroundSlice.reducer