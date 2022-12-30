import React, { useState } from 'react';
import { useDispatch } from 'react-redux'
import { setBackground } from '../../store/feature/background';
import ImageItem from './ImageItem';

import {backgroundImageList} from './configure'

import './Background.scss';

const Background = (props) => {
    const dispatch = useDispatch();
    const [bgImageList, setBackgroundImageList] = useState(backgroundImageList);

    const onSelect = (image) => {
		let _imageList = JSON.parse(JSON.stringify(bgImageList));

		_imageList.map((item, index) => {
			item.isSelect = item.image === image;
            if (item.isSelect) {
                let _image = JSON.parse(JSON.stringify(item));
				_image.selectIndex = index;
                dispatch(setBackground(_image));
            }
           
            return item
		});
		setBackgroundImageList(_imageList);
	};

	return (
		<div className="background-box">
            <div className="image-wrapper">
                {bgImageList.map((item, index) => {
                    return <ImageItem key={index} image={item.image} type={item.type} isSelect={item.isSelect} watermark={false} onSelect={onSelect} />;
                })}
		    </div>
		</div>
	);
};

export default Background;