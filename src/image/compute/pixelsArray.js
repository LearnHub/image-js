// this function will return an array containing an array of XY

/**
 * Allows to generate an  array of pixels for an image binary image (bit depth = 1)
 * @memberof Image
 * @instance
 * @returns {[[pixels]]} - an array of [x,y] corresponding to the set pixels in the binary image
 */

export default function getPixelsArray() {
    this.checkProcessable('getPixelsArray', {
        bitDepth: [1]
    });

    if (this.bitDepth === 1) {
        let pixels = new Array(this.size);
        let counter = 0;
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (this.getBitXY(x, y) === 1) {
                    pixels[counter++] = [x, y];
                }
            }
        }
        pixels.length = counter;
        return pixels;
    }
}

