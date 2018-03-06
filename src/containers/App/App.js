import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { Cell, Column, ColumnGroup, Table } from 'fixed-data-table';
import '../../../node_modules/fixed-data-table/dist/fixed-data-table.css';
import '../../styles/app.css';

import _ from 'lodash';

@connect(
    state => ({rows: state.rows, cols: state.cols || new Array(10)})
)
export default class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      rows: [],
      cols: new Array(10)
    };
    this.onSnapshotReceived = this.onSnapshotReceived.bind(this);
    this.onUpdateReceived = this.onUpdateReceived.bind(this);
    this._cell = this._cell.bind(this);
    this._headerCell = this._headerCell.bind(this);
    this._generateCols = this._generateCols.bind(this);

    // Store last values in a Hashmap for effecient color test
    this.lastValRegistry = {};

    // Build a row buffer to store last payload data
    this.rowBuffer = [];

    // Mark if the initial payload has been received
    this.initialPayloadReceived = false;
  }

  onSnapshotReceived(data) {
    let rows = [];
    data.forEach(row => {
      rows[row.id] = row;
    });
    // const rows = this.state.rows.concat(data);
    console.log('snapshot' + rows);
    const cols = Object.keys(rows[0]);

    // Initial payload received
    // Mark and render
    this.initialPayloadReceived = true;
    this.setState({rows, cols});
  };
  onUpdateReceived(data) {
    // const rows = this.state.rows.concat(data);

    let rows = this.state.rows;
    data.forEach(newRow => {
      rows[newRow.id] = newRow;
    });

    // Fill up the row buffer
    this.rowBuffer = rows;
    // this.setState({rows});
  };
  _cell(cellProps) {
    const rowIndex = cellProps.rowIndex;
    const rowData = this.state.rows[rowIndex];
    const col = this.state.cols[cellProps.columnKey];
    const content = rowData[col];
    const self = this;
    
    // Create a position string for fast hashmap retrieval
    const pos = cellProps.columnKey + "," + cellProps.rowIndex;
    const lastVal = self.lastValRegistry[pos];

    // Determine color class that would apply to cells
    let clrcls;
    switch(true){
      case lastVal < content: clrcls="high"; break;
      case lastVal > content: clrcls="low"; break;
      default               : clrcls="";    break;
    }

    // Update the last registry
    self.lastValRegistry[pos] = content;
    return (
      <Cell><i className={clrcls}>{content}</i></Cell>
    );
  }

  _headerCell(cellProps) {
    const col = this.state.cols[cellProps.columnKey];
    return (
      <Cell>{col}</Cell>
    );
  }

  _generateCols() {
    console.log('generating...');
    let cols = [];
    this.state.cols.forEach((row, index) => {
      cols.push(
        <Column
          width={100}
          flexGrow={1}
          cell={this._cell}
          header={this._headerCell}
          columnKey={index}
          />
      );
    });
    console.log(cols);
    return cols;
  };
  componentDidMount() {
    const self = this;
    
    // The same can be achieved by piggybacking 
    // the socket event but we'll Create an interval for 2 reasons
    // 1. Interval calculates time series for us keeps the code lean
    // 2. Interval can be replaced by requestAnimationFrame method 
    //    to optimize rendering in certain cases
    self.interval = setInterval(()=>{
      // Exit if initial payload hasn't been received
      if(!self.initialPayloadReceived){return;}
      const rb = self.rowBuffer;
      self.setState({rb});

      // Re-Render data every second
    }, 1000);
    
    if (socket) {
      socket.on('snapshot', this.onSnapshotReceived);
      socket.on('updates', this.onUpdateReceived);
    }
  };
  componentWillUnmount() {
    // clear interval once the component un-mounts
    clearInterval(self.interval);
    if (socket) {
      socket.removeListener('snapshot', this.onSnapshotReceived);
      socket.removeListener('updates', this.onUpdateReceived);
    }
  };

  render() {
    const columns = this._generateCols();
    return (
      <Table
        rowHeight={30}
        width={window.innerWidth}
        maxHeight={window.innerHeight}
        headerHeight={35}
        rowsCount={this.state.rows.length}
        >
        {columns}
      </Table>
    );
  }
}
