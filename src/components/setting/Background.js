import React, { useState } from 'react';
import { useDispatch } from 'react-redux'
import { setBackground, setWatermark } from '../../store/feature/background';
import ImageItem from './ImageItem';

import {backgroundImageList, watermarkImageList} from './configure'

import './Background.scss';

const Background = (props) => {
    const dispatch = useDispatch();
    const [bgImageList, setBackgroundImageList] = useState(backgroundImageList);
    const [wmImageList, setWatermarkImageList] = useState(watermarkImageList);

    const onSelect = (image, watermark) => {

		let _imageList = watermark ? JSON.parse(JSON.stringify(wmImageList)) : JSON.parse(JSON.stringify(bgImageList));

		_imageList.map((item, index) => {
			item.isSelect = item.image === image;
            if (item.isSelect) {
                let _image = JSON.parse(JSON.stringify(item));
				_image.selectIndex = index;
                if (watermark) {
                    dispatch(setWatermark(_image));
                } else {
                    dispatch(setBackground(_image));
                }
                
            }
           
            return item
		});
        if (watermark) {
            setWatermarkImageList(_imageList);
        } else {
            setBackgroundImageList(_imageList);
        }

	};

	return (
		<div className="background-box">
            <div className="image-wrapper">
                {bgImageList.map((item, index) => {
                    return <ImageItem key={index} image={item.image} type={item.type} isSelect={item.isSelect} watermark={false} onSelect={onSelect} />;
                })}
		    </div>
            <div className="image-wrapper">
                {wmImageList.map((item, index) => {
                    return <ImageItem key={index} image={item.image} type={item.type} isSelect={item.isSelect} watermark={true} onSelect={onSelect} />;
                })}
		    </div>
		</div>
	);
};

export default Background;