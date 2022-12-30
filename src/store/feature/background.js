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
  },
  reducers: {
    setBackground(state, action) {
        let background = action.payload;
        return { ...state, background };
    },
  },
})

// Action creators are generated for each case reducer function
export const { setBackground } = backgroundSlice.actions

export default backgroundSlice.reducer