import ROIMapper from '../../../src/image/roi/creator/fromWaterShed';
import {Image} from '../common';
import joinROI from '../../../src/image/roi/joinROI';

describe('fin local', function () {
    it('Fusion 2 ROIs from 3 ROIs', function () {

        let image = new Image(10,10,
            [
                3,3,3,3,3,3,3,2,2,2,
                3,3,2,2,2,3,3,2,2,4,
                4,3,2,1,2,2,3,1,2,4,
                4,3,2,2,2,2,3,3,3,4,
                4,4,4,3,2,3,3,3,3,4,
                4,4,4,3,3,3,3,3,3,3,
                4,3,3,3,3,3,2,2,2,3,
                4,4,3,3,3,3,2,1,2,2,
                4,4,4,4,3,2,2,2,2,3,
                4,4,4,4,3,3,3,3,2,3

            ],
            {kind: 'GREY'}
        );
        let mask = new Image(10, 10, {kind: 'BINARY'});
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                if (image.data[i + j * 10] !== 4) {
                    mask.setBitXY(i, j);

                }
            }

        }
        let map = ROIMapper.call(image, {fillMaxValue:5, mask:mask, interval: 1});
        let roiManager = image.getROIManager();
        roiManager.putMap(map.pixels);
        let rois = roiManager.getROI();
        map = joinROI(rois, {value:3});
        map.pixels.should.eql(
            [
                1,1,1,1,1,1,1,1,1,1,
                1,1,1,1,1,1,1,1,1,0,
                0,1,1,1,1,1,1,1,1,0,
                0,1,1,1,1,1,1,1,1,0,
                0,0,0,1,1,1,3,1,1,0,
                0,0,0,1,1,3,3,3,3,3,
                0,1,1,1,3,3,3,3,3,3,
                0,0,3,3,3,3,3,3,3,3,
                0,0,0,0,3,3,3,3,3,3,
                0,0,0,0,3,3,3,3,3,3]
        );

    });
});
