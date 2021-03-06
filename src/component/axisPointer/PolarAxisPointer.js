define(function(require) {
    'use strict';

    var formatUtil = require('../../util/format');
    var BaseAxisPointer = require('./BaseAxisPointer');
    var graphic = require('../../util/graphic');
    var viewHelper = require('./viewHelper');
    var matrix = require('zrender/core/matrix');
    var AxisBuilder = require('../axis/AxisBuilder');

    var PolarAxisPointer = BaseAxisPointer.extend({

        /**
         * @override
         */
        useAnimation: function (axisModel, axisPointerModel) {
            return axisModel.axis.type === 'category'
                || axisPointerModel.get('snap');
        },

        /**
         * @override
         */
        makeElOption: function (elOption, value, axisModel, axisPointerModel) {
            var axis = axisModel.axis;
            var polar = axis.polar;
            var otherAxis = polar.getOtherAxis(axis);
            var otherExtent = otherAxis.getExtent();

            var coordValue;
            coordValue = axis['dataTo' + formatUtil.capitalFirst(axis.dim)](value);

            var elStyle = viewHelper.buildElStyle(axisPointerModel);
            var pointerOption = pointerShapeBuilder[axisPointerModel.get('type')](
                axis, polar, coordValue, otherExtent, elStyle
            );
            pointerOption.style = elStyle;

            elOption.graphicKey = pointerOption.type;
            elOption.pointer = pointerOption;

            var labelMargin = axisPointerModel.get('label.margin');
            var labelPos = getLabelPosition(value, axisModel, axisPointerModel, polar, labelMargin);
            viewHelper.buildLabelElOption(elOption, value, labelPos, axisModel, axisPointerModel);
        }

    });

    function getLabelPosition(value, axisModel, axisPointerModel, polar, labelMargin) {
        var axis = axisModel.axis;
        var coord = axis.dataToCoord(value);
        var axisAngle = polar.getAngleAxis().getExtent()[0];
        var radiusExtent = polar.getRadiusAxis().getExtent();
        var position;
        var align;
        var verticalAlign;

        if (axis.dim === 'radius') {
            var transform = matrix.create();
            matrix.rotate(transform, transform, axisAngle / 180 * Math.PI);
            matrix.translate(transform, transform, [polar.cx, polar.cy]);
            position = graphic.applyTransform([coord, labelMargin], transform);

            // ???
            // label verticalalign

            var labelRotation = axisModel.getModel('axisLabel').get('rotate');
            var labelLayout = AxisBuilder.innerTextLayout(
                labelRotation * Math.PI / 180, axisAngle, -1
            );
            align = labelLayout.align;
            verticalAlign = labelLayout.verticalAlign;
        }
        else { // angle axis
            var r = radiusExtent[1];
            position = polar.coordToPoint([r + labelMargin, coord]);
            var cx = polar.cx;
            var cy = polar.cy;
            align = Math.abs(position[0] - cx) / r < 0.3
                ? 'center' : (position[0] > cx ? 'left' : 'right');
            verticalAlign = Math.abs(position[1] - cy) / r < 0.3
                ? 'middle' : (position[1] > cy ? 'top' : 'bottom');
        }

        return {
            position: position,
            align: align,
            verticalAlign: verticalAlign
        };
    }


    var pointerShapeBuilder = {

        line: function (axis, polar, coordValue, otherExtent, elStyle) {
            return axis.dim === 'angle'
                ? {
                    type: 'Line',
                    shape: viewHelper.makeLineShape(
                        polar.coordToPoint([otherExtent[0], coordValue]),
                        polar.coordToPoint([otherExtent[1], coordValue])
                    )
                }
                : {
                    type: 'Sector',
                    shape: {
                        cx: polar.cx,
                        cy: polar.cy,
                        r: coordValue
                    }
                };
        },

        shadow: function (axis, polar, coordValue, otherExtent, elStyle) {
            var bandWidth = axis.getBandWidth();
            var radian = Math.PI / 180;

            return axis.dim === 'angle'
                ? {
                    type: 'Sector',
                    shape: viewHelper.makeSectorShape(
                        polar.cx, polar.cy,
                        otherExtent[0], otherExtent[1],
                        // In ECharts y is negative if angle is positive
                        (-coordValue - bandWidth / 2) * radian,
                        (-coordValue + bandWidth / 2) * radian
                    )
                }
                : {
                    type: 'Sector',
                    shape: viewHelper.makeSectorShape(
                        polar.cx, polar.cy,
                        coordValue - bandWidth / 2,
                        coordValue + bandWidth / 2,
                        0, Math.PI * 2
                    )
                };
        }
    };

    return PolarAxisPointer;
});