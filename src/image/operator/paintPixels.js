import {RGB} from '../model/model';
import Shape from '../../util/shape';


/**
 * Paint pixels on the current image.
 * @memberof Image
 * @instance
 * @param {[[pixels]]} pixels - Array of [x,y] points
 * @param {array} [$1.color=[max,0,0]] - Array of 3 elements (R, G, B), default is red.
 * @param {array} [$1.shape] - Array of 3 elements (R, G, B), default is red.
 * @returns {Image} The original painted image
 */

export default function paintPixels(pixels, {
    color = [this.maxValue, 0, 0],
    shape} = {}) {

    this.checkProcessable('paintPixels', {
        components: 3,
        bitDepth: [8, 16],
        colorModel: RGB
    });

    let shapePixels = (new Shape(shape)).getPixels();

    let numberChannels = Math.min(this.channels, color.length);

    for (let i = 0; i < pixels.length; i++) {
        let xP = pixels[i][0];
        let yP = pixels[i][1];
        for (let j = 0; j < shapePixels.length; j++) {
            let xS = shapePixels[j][0];
            let yS = shapePixels[j][1];
            if (
                ((xP + xS) >= 0) &&
                ((yP + yS) >= 0) &&
                ((xP + xS) < this.width) &&
                ((yP + yS) < this.height)
            ) {
                let position = (xP + xS + (yP + yS) * this.width) * this.channels;
                for (let channel = 0; channel < numberChannels; channel++) {
                    this.data[position + channel] = color[channel];
                }
            }
        }
    }
}




