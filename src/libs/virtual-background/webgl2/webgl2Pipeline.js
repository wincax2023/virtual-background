import { inputResolutions } from "../core/helpers/segmentationHelper";
import { compileShader, createTexture, glsl } from "../helpers/webglHelper";
import { buildBackgroundBlurStage } from "./backgroundBlurStage";
import { buildBackgroundImageStage } from "./backgroundImageStage";
import { buildJointBilateralFilterStage } from "./jointBilateralFilterStage";
import { buildResizingStage } from "./resizingStage";
import { buildSoftmaxStage } from "./softmaxStage";
import { buildWatermarkImageStage } from "./watermarkImageStage";

export function buildWebGL2Pipeline(
  sourcePlayback,
  backgroundImage,
  backgroundConfig,
  segmentationConfig,
  canvas,
  tflite,
  watermarkImage,
  addFrameEvent
) {
  console.warn("buildWebGL2Pipeline : ", segmentationConfig);
  const vertexShaderSource = glsl`#version 300 es

    in vec2 a_position;
    in vec2 a_texCoord;

    out vec2 v_texCoord;

    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  const { width: frameWidth, height: frameHeight } = sourcePlayback;

  // console.warn("sourcePlayback : ", sourcePlayback);
  const [segmentationWidth, segmentationHeight] =
    inputResolutions[segmentationConfig.inputResolution];

  const gl = canvas.getContext("webgl2");

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);

  const vertexArray = gl.createVertexArray();
  gl.bindVertexArray(vertexArray);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]),
    gl.STATIC_DRAW
  );

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0]),
    gl.STATIC_DRAW
  );

  // We don't use texStorage2D here because texImage2D seems faster
  // to upload video texture than texSubImage2D even though the latter
  // is supposed to be the recommended way:
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#use_texstorage_to_create_textures
  const inputFrameTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, inputFrameTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // TODO Rename segmentation and person mask to be more specific
  const segmentationTexture = createTexture(
    gl,
    gl.RGBA8,
    segmentationWidth,
    segmentationHeight
  );
  const personMaskTexture = createTexture(
    gl,
    gl.RGBA8,
    frameWidth,
    frameHeight
  );

  const resizingStage = buildResizingStage(
    gl,
    vertexShader,
    positionBuffer,
    texCoordBuffer,
    segmentationConfig,
    tflite
  );
  const loadSegmentationStage = buildSoftmaxStage(
    gl,
    vertexShader,
    positionBuffer,
    texCoordBuffer,
    segmentationConfig,
    tflite,
    segmentationTexture
  );
  const jointBilateralFilterStage = buildJointBilateralFilterStage(
    gl,
    vertexShader,
    positionBuffer,
    texCoordBuffer,
    segmentationTexture,
    segmentationConfig,
    personMaskTexture,
    canvas
  );
  const backgroundStage =
    backgroundConfig.type === "blur"
      ? buildBackgroundBlurStage(
          gl,
          vertexShader,
          positionBuffer,
          texCoordBuffer,
          personMaskTexture,
          canvas
        )
      : buildBackgroundImageStage(
          gl,
          positionBuffer,
          texCoordBuffer,
          personMaskTexture,
          backgroundImage,
          canvas
        );

  const watermarkStage = buildWatermarkImageStage(
    gl,
    positionBuffer,
    texCoordBuffer,
    // personMaskTexture,
    watermarkImage,
    canvas
  );

  async function render() {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputFrameTexture);

    // texImage2D seems faster than texSubImage2D to upload
    // video texture
    // texImage2D(target, level, internalformat, width, height, border, format, type, source)
    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, frameWidth, frameHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, sourcePlayback.htmlElement)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      sourcePlayback.htmlElement
    );

    gl.bindVertexArray(vertexArray);

    await resizingStage.render();

    addFrameEvent();

    tflite._runInference();

    addFrameEvent();

    loadSegmentationStage.render();
    jointBilateralFilterStage.render();
    backgroundStage.render();

    if (watermarkImage) {
      watermarkStage.render();
      // gl.texImage2D(
      //   gl.TEXTURE_2D,
      //   0,
      //   gl.RGBA,
      //   frameWidth,
      //   frameHeight,
      //   0,
      //   gl.RGBA,
      //   gl.UNSIGNED_BYTE,
      //   watermarkImage
      // );
    }

    // console.warn("render");
  }

  function updatePostProcessingConfig(postProcessingConfig) {
    console.warn("updatePostProcessingConfig", postProcessingConfig);
    jointBilateralFilterStage.updateSigmaSpace(
      postProcessingConfig.jointBilateralFilter.sigmaSpace
    );
    jointBilateralFilterStage.updateSigmaColor(
      postProcessingConfig.jointBilateralFilter.sigmaColor
    );

    if (backgroundConfig.type === "image") {
      const backgroundImageStage = backgroundStage;
      backgroundImageStage.updateCoverage(postProcessingConfig.coverage);
      backgroundImageStage.updateLightWrapping(
        postProcessingConfig.lightWrapping
      );
      backgroundImageStage.updateBlendMode(postProcessingConfig.blendMode);
    } else if (backgroundConfig.type === "blur") {
      const backgroundBlurStage = backgroundStage;
      backgroundBlurStage.updateCoverage(postProcessingConfig.coverage);
    } else {
      console.warn("backgroundConfig.type : ", backgroundConfig.type);
      // TODO Handle no background in a separate pipeline path
      const backgroundImageStage = backgroundStage;
      backgroundImageStage.updateCoverage([0, 0.9999]);
      backgroundImageStage.updateLightWrapping(0);
    }
  }

  function cleanUp() {
    watermarkStage.cleanUp();
    backgroundStage.cleanUp();
    jointBilateralFilterStage.cleanUp();
    loadSegmentationStage.cleanUp();
    resizingStage.cleanUp();

    gl.deleteTexture(personMaskTexture);
    gl.deleteTexture(segmentationTexture);
    gl.deleteTexture(inputFrameTexture);
    gl.deleteBuffer(texCoordBuffer);
    gl.deleteBuffer(positionBuffer);
    gl.deleteVertexArray(vertexArray);
    gl.deleteShader(vertexShader);
  }

  return { render, updatePostProcessingConfig, cleanUp };
}
