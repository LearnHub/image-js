import {RGB} from '../model/model';

/**
 * Paint a mask or masks on the current image.
 * @memberof Image
 * @instance
 * @param {(Image|Image[])} mask - Image containing a binary mask
 * @param {array} [$1.color=[max,0,0]] - Array of 3 elements (R, G, B), default is red.
 * @returns {Image} The original painted image
 */

export default function paintMasks(masks, {
    color = [this.maxValue, 0, 0]} = {}) {

    this.checkProcessable('paintMasks', {
        components: 3,
        bitDepth: [8, 16],
        colorModel: RGB
    });

    if (!Array.isArray(masks)) masks = [masks];

    let numberChannels = Math.min(this.channels, color.length);



    for (let i = 0; i < masks.length; i++) {
        let roi = masks[i];
        // we need to find the parent image to calculate the relative position

        for (let x = 0; x < roi.width; x++) {
            for (let y = 0; y < roi.height; y++) {
                if (roi.getBitXY(x, y)) {
                    for (let channel = 0; channel < numberChannels; channel++) {
                        this.setValueXY(x + roi.position[0], y + roi.position[1], channel, color[channel]);
                    }
                }
            }
        }
    }
}
