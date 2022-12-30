import React from 'react';

import './Background.scss';


const ImageItem = (props) => {

    const { type, isSelect, image, onSelect } = props;

    const onClick = () => {
        onSelect(image);
    };

    const getClassName = () => {
        if (isSelect) {
            return type === 'blur' ? "image-box select blur" : "image-box select"
        } else {
            return type === 'blur' ? "image-box blur" : "image-box"
        }
    }
    // 不添加水印
	return (
		<div className={getClassName()} onClick={onClick}>
            {type === 'none' ? <img className='none-image' src={ image } alt='' id={image} /> : null}
            {type === 'none' ? (<span className='none-label'>无背景</span>) : null}
            {type === 'blur' ? <img className='blur-image' src={ image } alt='' id={image} /> : null}
            {type === 'blur' ? (<span className='blur-label'>模糊</span>) : null}
            {type === 'image' ? <img className='image' src={ image } alt='' id={image} /> : null}
		</div>
	);
};

export default ImageItem;
