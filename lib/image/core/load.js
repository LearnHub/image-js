"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = load;

var _fastJpeg = require("fast-jpeg");

var _fastPng = require("fast-png");

var _imageType = _interopRequireDefault(require("image-type"));

var _jpegJs = require("jpeg-js");

var _tiff = require("tiff");

var _Stack = _interopRequireDefault(require("../../stack/Stack"));

var _base = require("../../util/base64");

var _Image = _interopRequireDefault(require("../Image"));

var _model = require("../model/model");

var _environment = require("./environment");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const isDataURL = /^data:[a-z]+\/(?:[a-z]+);base64,/;
/**
 * Load an image
 * @memberof Image
 * @static
 * @param {string|ArrayBuffer|Buffer|Uint8Array} image - URL of the image (browser, can be a dataURL) or path (Node.js)
 * or buffer containing the binary data
 * @param {object} [options] - In the browser, the options object is passed to the underlying `fetch` call.
 * @return {Promise<Image>}
 * @example
 * const image = await Image.load('https://example.com/image.png');
 */

function load(image, options) {
  if (typeof image === 'string') {
    return loadURL(image, options);
  } else if (image instanceof ArrayBuffer) {
    return Promise.resolve(loadBinary(new Uint8Array(image)));
  } else if (image.buffer) {
    return Promise.resolve(loadBinary(image));
  } else {
    throw new Error('argument to "load" must be a string or buffer.');
  }
}

function loadBinary(image, base64Url) {
  const type = (0, _imageType.default)(image);

  if (type) {
    switch (type.mime) {
      case 'image/png':
        return loadPNG(image);

      case 'image/jpeg':
        return loadJPEG(image);

      case 'image/tiff':
        return loadTIFF(image);

      default:
        return loadGeneric(getBase64(type.mime));
    }
  }

  return loadGeneric(getBase64('application/octet-stream'));

  function getBase64(type) {
    if (base64Url) {
      return base64Url;
    } else {
      return (0, _base.toBase64URL)(image, type);
    }
  }
}

function loadURL(url, options) {
  const dataURL = url.slice(0, 64).match(isDataURL);
  let binaryDataP;

  if (dataURL !== null) {
    binaryDataP = Promise.resolve((0, _base.decode)(url.slice(dataURL[0].length)));
  } else {
    binaryDataP = (0, _environment.fetchBinary)(url, options);
  }

  return binaryDataP.then(binaryData => {
    const uint8 = new Uint8Array(binaryData);
    return loadBinary(uint8, dataURL ? url : undefined);
  });
}

function loadPNG(data) {
  const png = (0, _fastPng.decode)(data);
  let channels = png.channels;
  let components;
  let alpha = 0;

  if (channels === 2 || channels === 4) {
    components = channels - 1;
    alpha = 1;
  } else {
    components = channels;
  }

  if (png.palette) {
    return loadPNGFromPalette(png);
  }

  return new _Image.default(png.width, png.height, png.data, {
    components,
    alpha,
    bitDepth: png.depth
  });
}

function loadPNGFromPalette(png) {
  const pixels = png.width * png.height;
  const channels = png.palette[0].length;
  const data = new Uint8Array(pixels * channels);
  const pixelsPerByte = 8 / png.depth;
  const factor = png.depth < 8 ? pixelsPerByte : 1;
  const mask = parseInt('1'.repeat(png.depth), 2);
  const hasAlpha = channels === 4;
  let dataIndex = 0;

  for (let i = 0; i < pixels; i++) {
    const index = Math.floor(i / factor);
    let value = png.data[index];

    if (png.depth < 8) {
      value = value >>> png.depth * (pixelsPerByte - 1 - i % pixelsPerByte) & mask;
    }

    const paletteValue = png.palette[value];
    data[dataIndex++] = paletteValue[0];
    data[dataIndex++] = paletteValue[1];
    data[dataIndex++] = paletteValue[2];

    if (hasAlpha) {
      data[dataIndex++] = paletteValue[3];
    }
  }

  return new _Image.default(png.width, png.height, data, {
    components: 3,
    alpha: hasAlpha,
    bitDepth: 8
  });
}

function loadJPEG(data) {
  const decodedExif = (0, _fastJpeg.decode)(data);
  let meta;

  if (decodedExif.exif) {
    meta = getMetadata(decodedExif.exif);
  }

  const jpeg = (0, _jpegJs.decode)(data, {
    useTArray: true,
    maxMemoryUsageInMB: 8096
  });
  let image = new _Image.default(jpeg.width, jpeg.height, jpeg.data, {
    meta
  });

  if (meta && meta.tiff.tags.Orientation) {
    const orientation = meta.tiff.tags.Orientation;

    if (orientation > 2) {
      image = image.rotate({
        3: 180,
        4: 180,
        5: 90,
        6: 90,
        7: 270,
        8: 270
      }[orientation]);
    }

    if ([2, 4, 5, 7].includes(orientation)) {
      image = image.flipX();
    }
  }

  return image;
}

function loadTIFF(data) {
  let result = (0, _tiff.decode)(data);

  if (result.length === 1) {
    return getImageFromIFD(result[0]);
  } else {
    return new _Stack.default(result.map(getImageFromIFD));
  }
}

function getMetadata(image) {
  const metadata = {
    tiff: {
      fields: image.fields,
      tags: image.map
    }
  };

  if (image.exif) {
    metadata.exif = image.exif;
  }

  if (image.gps) {
    metadata.gps = image.gps;
  }

  return metadata;
}

function getImageFromIFD(image) {
  if (image.type === 3) {
    // Palette
    const data = new Uint16Array(3 * image.width * image.height);
    const palette = image.palette;
    let ptr = 0;

    for (let i = 0; i < image.data.length; i++) {
      const index = image.data[i];
      const color = palette[index];
      data[ptr++] = color[0];
      data[ptr++] = color[1];
      data[ptr++] = color[2];
    }

    return new _Image.default(image.width, image.height, data, {
      components: 3,
      alpha: image.alpha,
      colorModel: _model.RGB,
      bitDepth: 16,
      meta: getMetadata(image)
    });
  } else {
    return new _Image.default(image.width, image.height, image.data, {
      components: image.type === 2 ? 3 : 1,
      alpha: image.alpha,
      colorModel: image.type === 2 ? _model.RGB : _model.GREY,
      bitDepth: image.bitsPerSample.length ? image.bitsPerSample[0] : image.bitsPerSample,
      meta: getMetadata(image)
    });
  }
}

function loadGeneric(url, options) {
  options = options || {};
  return new Promise(function (resolve, reject) {
    let image = new _environment.DOMImage();

    image.onload = function () {
      let w = image.width;
      let h = image.height;
      let canvas = (0, _environment.createCanvas)(w, h);
      let ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, w, h);
      let data = ctx.getImageData(0, 0, w, h).data;
      resolve(new _Image.default(w, h, data, options));
    };

    image.onerror = function () {
      reject(new Error(`Could not load ${url}`));
    };

    image.src = url;
  });
}