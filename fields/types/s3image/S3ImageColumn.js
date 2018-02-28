import React from 'react';
import S3ImageSummary from '../../components/columns/S3ImageSummary';
import ItemsTableCell from '../../components/ItemsTableCell';
import ItemsTableValue from '../../components/ItemsTableValue';

var S3ImageColumn = React.createClass({
	displayName: 'S3ImageColumn',
	propTypes: {
		col: React.PropTypes.object,
		data: React.PropTypes.object,
	},
	renderValue: function () {
		var value = this.props.data.fields[this.props.col.path];
		if (!value || !Object.keys(value).length) return;

		return (
			<ItemsTableValue field={this.props.col.type}>
				<S3ImageSummary label="dimensions" image={value} secure={this.props.col.field.secure} />
			</ItemsTableValue>
		);

	},
	render () {
		return (
			<ItemsTableCell>
				{this.renderValue()}
			</ItemsTableCell>
		);
	},
});

module.exports = S3ImageColumn;
