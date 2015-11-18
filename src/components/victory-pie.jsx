import d3 from "d3";
import _ from "lodash";
import log from "../log";
import React from "react";
import Radium from "radium";
import Util from "../util";
import {VictoryAnimation} from "victory-animation";
import ReactART from "react-art";

let {
  Surface,
  Path,
  Group,
  Shape,
  Text,
  Transform
} = ReactART;

const defaultStyles = {
  data: {
    padding: 5,
    stroke: "white",
    strokeWidth: 1
  },
  labels: {
    padding: 10,
    fill: "black",
    strokeWidth: 0,
    stroke: "transparent",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontSize: 10,
    fontWidth: "normal",
    textAnchor: "middle"
  }
};

@Radium
export default class VictoryPie extends React.Component {
  static propTypes = {
    /**
     * The animate prop specifies props for victory-animation to use. If this prop is
     * not given, the pie chart will not tween between changing data / style props.
     * Large datasets might animate slowly due to the inherent limits of svg rendering.
     * @examples {velocity: 0.02, onEnd: () => alert("done!")}
     */
    animate: React.PropTypes.object,
    /**
     * Objects in the data array must be of the form { x: <x-val>, y: <y-val> }, where <x-val>
     * is the slice label (string or number), and <y-val> is the corresponding number
     * used to calculate arc length as a proportion of the pie's circumference.
     * If the data prop is omitted, the pie will render sample data.
     */
    data: React.PropTypes.arrayOf(React.PropTypes.shape({
      x: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number]),
      y: React.PropTypes.number
    })),
    /**
     * The overall end angle of the pie in degrees. This prop is used in conjunction with
     * startAngle to create a pie that spans only a segment of a circle.
     */
    endAngle: React.PropTypes.number,
    /**
     * The height props specifies the height of the chart container element in pixels
     */
    height: React.PropTypes.number,
    /**
     * When creating a donut chart, this prop determines the number of pixels between
     * the center of the chart and the inner edge of a donut. When this prop is set to zero
     * a regular pie chart is rendered.
     */
    innerRadius: React.PropTypes.number,
    /**
     * The padAngle prop determines the amount of separation between adjacent data slices
     * in number of degrees
     */
    padAngle: React.PropTypes.number,
    /**
     * The padding props specifies the amount of padding in number of pixels between
     * the edge of the chart and any rendered child components. This prop can be given
     * as a number or as an object with padding specified for top, bottom, left
     * and right.
     */
    padding: React.PropTypes.oneOfType([
      React.PropTypes.number,
      React.PropTypes.shape({
        top: React.PropTypes.number,
        bottom: React.PropTypes.number,
        left: React.PropTypes.number,
        right: React.PropTypes.number
      })
    ]),
    /**
     * The sliceColors prop defines an array of colors to use for distinguishing data
     * segments in a pie chart. If the data array is longer than the sliceColors array,
     * colors will be reused.
     */
    sliceColors: React.PropTypes.arrayOf(React.PropTypes.string),
    /**
     * The sort prop determines how to order data. This prop can be given as "ascending"
     * or "descending", or as a custom comparator function
     */
    sort: React.PropTypes.oneOfType([
      React.PropTypes.oneOf(["ascending", "descending"]),
      React.PropTypes.func
    ]),
    /**
     * The standalone prop determines whether VictoryPie should render as a standalone
     * svg, or in a g tag to be included in an svg
     */
    standalone: React.PropTypes.bool,
    /**
     * The overall start angle of the pie in degrees. This prop is used in conjunction with
     * endAngle to create a pie that spans only a segment of a circle.
     */
    startAngle: React.PropTypes.number,
    /**
     * The style prop specifies styles for your pie. VictoryPie relies on Radium,
     * so valid Radium style objects should work for this prop, however properties like
     * height, width, padding and margin are used to calculate the radius of the pi, and need to be
     * expressed as a number of pixels
     * @examples {data: {stroke: "black"}, label: {fontSize: 10}}
     */
    style: React.PropTypes.object,
    /**
     * The width props specifies the width of the chart container element in pixels
     */
    width: React.PropTypes.number
  }

  static defaultProps = {
    data: [
      { x: "A", y: 1 },
      { x: "B", y: 2 },
      { x: "C", y: 3 },
      { x: "D", y: 1 },
      { x: "E", y: 2 }
    ],
    endAngle: 360,
    height: 400,
    innerRadius: 0,
    padAngle: 0,
    padding: 30,
    sliceColors: [
      "#75C776",
      "#39B6C5",
      "#78CCC4",
      "#62C3A4",
      "#64A8D1",
      "#8C95C8",
      "#3BAF74"
    ],
    sort: null,
    startAngle: 0,
    standalone: true,
    width: 400
  }

  componentWillMount() {
    // If animating, the `VictoryPie` instance wrapped in `VictoryAnimation`
    // will compute these values.
    if (!this.props.animate) {
      this.getCalculatedValues(this.props);
    }
  }

  componentWillReceiveProps(nextProps) {
    this.getCalculatedValues(nextProps);
  }

  getCalculatedValues(props) {
    this.style = this.getStyles(props);
    this.padding = this.getPadding(props);
    this.radius = this.getRadius(props);
    this.sortOrder = this.getSortOrder(props);
    this.colors = d3.scale.ordinal().range(props.sliceColors);
    this.slice = d3.svg.arc()
      .outerRadius(this.radius)
      .innerRadius(this.props.innerRadius);
    this.labelPosition = this.getLabelPosition(props);
    this.pie = d3.layout.pie()
      .sort(this.sortOrder)
      .startAngle(Util.degreesToRadians(props.startAngle))
      .endAngle(Util.degreesToRadians(props.endAngle))
      .padAngle(Util.degreesToRadians(props.padAngle))
      .value((data) => { return data.y; });
  }

  getStyles(props) {
    const style = props.style || defaultStyles;
    const {data, labels, parent} = style;
    return {
      parent: _.merge({height: props.height, width: props.width}, parent),
      data: _.merge({}, defaultStyles.data, data),
      labels: _.merge({}, defaultStyles.labels, labels)
    };
  }

  getPadding(props) {
    const padding = _.isNumber(props.padding) ? props.padding : 0;
    const paddingObj = _.isObject(props.padding) ? props.padding : {};
    return {
      top: paddingObj.top || padding,
      bottom: paddingObj.bottom || padding,
      left: paddingObj.left || padding,
      right: paddingObj.right || padding
    };
  }

  getRadius(props) {
    return _.min([
      props.width - this.padding.left - this.padding.right,
      props.height - this.padding.top - this.padding.bottom
    ]) / 2;
  }

  getLabelPosition(props) {
    // TODO: better label positioning
    const innerRadius = props.innerRadius ?
      props.innerRadius + this.style.labels.padding :
      this.style.labels.padding;
    return d3.svg.arc()
      .outerRadius(this.radius)
      .innerRadius(innerRadius);
  }

  getSortOrder(props) {
    // TODO: animation looks broken when a sort order is specified
    let comparator = props.sort;
    if (!_.isNull(comparator) && _.isString(comparator)) {
      if (comparator === "ascending" || comparator === "descending") {
        comparator = (a, b) => { return d3[props.sort](a.y, b.y); };
      } else {
        log.warn("Victory Pie: Invalid sort string. Try 'ascending' or 'descending'.");
        comparator = null;
      }
    }
    return comparator;
  }

  drawArcs(slices) {
    const indexArray = _.range(0, this.props.data.length);
    const sliceData = this.pie(this.props.data, indexArray);
    const sliceComponents = _.map(slices, (slice, index) => {
      const fill = this.colors(slice.x);
      const style = _.merge({}, this.style.data, {fill});
      const data = sliceData[index];
      const label = this.labelPosition.centroid(data);
      return (
        <Group key={index}>
          <Shape
            fill={fill}
            d={this.slice(data)}/>
          <Text
            fill={this.style.labels.fill}
            font={this.style.labels.fontWeight + " " + this.style.labels.fontSize + "px " + this.style.labels.fontFamily}
            textAnchor="middle"
            transform={new Transform().translate(label[0], label[1])}>
            {slice.x}
          </Text>
        </Group>
      );
    });

    return (<Group>{sliceComponents}</Group>);
  }

  render() {
    if (this.props.animate) {
      // Do less work by having `VictoryAnimation` tween only values that
      // make sense to tween. In the future, allow customization of animated
      // prop whitelist/blacklist?
      const animateData = _.omit(this.props, [
        "animate", "standalone"
      ]);
      return (
        <VictoryAnimation {...this.props.animate} data={animateData}>
          {props => <VictoryPie {...this.props} {...props} animate={null}/>}
        </VictoryAnimation>
      );
    }
    const style = this.style.parent;
    const xOffset = this.radius + this.padding.left;
    const yOffset = this.radius + this.padding.top;
    const group = (
      <Group style={style}
        transform={
          new Transform().translate(this.props.width / 2,this.props.height / 2)}>
        {this.drawArcs(this.props.data)}
      </Group>
    );

    return this.props.standalone ? <Surface width={style.width} height={style.height} style={style}>{group}</Surface> : group;
  }
}
