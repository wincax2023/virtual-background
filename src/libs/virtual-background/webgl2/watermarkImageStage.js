import {
  compileShader,
  createPiplelineStageProgram,
  createTexture,
  glsl,
} from "../helpers/webglHelper";

export function buildWatermarkImageStage(
  gl,
  positionBuffer,
  texCoordBuffer,
  watermarkImage,
  canvas
) {
  const vertexShaderSource = glsl`#version 300 es
    // An attribute is an input to a vertex shader, it will receive data from bugger
    in vec2 a_position;
    in vec2 a_texCoord;
  
    // Used to pass the texture coordinates to the fragment shader
    out vec2 v_texCoord;
  
    // All shaders have a main function
    void main(){
      // Flipping Y is required when rendering to canvas
      gl_Position = vec4(a_position * vec2(1.0, -1.0), 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  const fragmentShaderSource = glsl`#version 300 es
  precision mediump float;

  // out texture
  uniform sampler2D u_image;
 
  // the texCoords passed in from the vertex shader
  in vec2 v_texCoord;
 
  // declare an output for fragment shader
  out vec4 outColor;
 
  void main(){
    outColor = texture(u_image,v_texCoord).rgba;
  }
  `;

  const outputWidth = 282;
  const outputHeight = 74;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );
  const program = createPiplelineStageProgram(
    gl,
    vertexShader,
    fragmentShader,
    positionBuffer,
    texCoordBuffer
  );

  // lookup uniforms
  const watermarkLocation = gl.getUniformLocation(program, "u_image");

  let watermarkTexture = null;
  // TODO Find a better to handle background being loaded
  if (watermarkImage?.complete) {
    updateWatermarkImage(watermarkImage);
  } else if (watermarkImage) {
    watermarkImage.onload = () => {
      updateWatermarkImage(watermarkImage);
    };
  }

  gl.useProgram(program);
  // gl.blendFunc(gl.ONE_MINUS_CONSTANT_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  // gl.enable(gl.BLEND);

  async function render() {
    gl.viewport(0, canvas.height - outputHeight, outputWidth, outputHeight);
    gl.enable(gl.BLEND);
    // gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE_MINUS_CONSTANT_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, watermarkTexture);
    gl.uniform1i(watermarkLocation, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.blendFunc(gl.ONE, gl.ZERO);
  }

  function updateWatermarkImage(watermarkImage) {
    watermarkTexture = createTexture(
      gl,
      gl.RGBA8,
      watermarkImage.naturalWidth,
      watermarkImage.naturalHeight,
      gl.LINEAR,
      gl.LINEAR
    );
    // WebGL2
    // texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, source)
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      watermarkImage.naturalWidth,
      watermarkImage.naturalHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      watermarkImage
    );
  }

  function cleanUp() {
    gl.deleteTexture(watermarkTexture);
    gl.deleteProgram(program);
    gl.deleteShader(fragmentShader);
    gl.deleteShader(vertexShader);
  }

  return { render, cleanUp };
}
