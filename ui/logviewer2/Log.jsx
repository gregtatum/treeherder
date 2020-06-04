/* eslint-disable max-classes-per-file */
import React from 'react';
import PropTypes from 'prop-types';

import TreeView from './TreeView';

const noop = () => {};

class LogTree {
  constructor(log) {
    this.log = log;
    this.logLowerCase = log.map((string) => string.toLowerCase());
    this.indexes = Array(log.length)
      .fill(0)
      .map((_, index) => index);

    this.parentToChildren = new Map();
    this.childToParent = new Map();
    this.roots = [];
    this.hasFailingChildren = new Set();
    this.skippedTests = new Set();
    this.computeRelationships(log);
  }

  computeRelationships(log) {
    const {
      parentToChildren,
      childToParent,
      roots,
      hasFailingChildren,
      skippedTests,
    } = this;
    // These are either raw strings, or an object containing the child nodes.
    let logIndex = 0;
    let parent = -1;
    for (; logIndex < log.length; logIndex++) {
      const message = log[logIndex];
      const isNewSection =
        logIndex === 0 ||
        message.includes('INFO - SUITE-START') ||
        message.includes('INFO - TEST-START');

      if (isNewSection) {
        // Make sure this starts a new root node.
        parent = -1;
      }

      if (parent === -1) {
        roots.push(logIndex);
      } else {
        // Set the map information for parents and children.
        let children = parentToChildren.get(parent);
        if (!children) {
          children = [];
          parentToChildren.set(parent, children);
        }
        children.push(logIndex);
        childToParent.set(logIndex, parent);

        // Check to see if this is a failing test.
        if (
          message.includes('INFO - TEST-UNEXPECTED-FAIL') ||
          message.includes('PROCESS-CRASH')
        ) {
          hasFailingChildren.add(parent);
        }

        if (message.includes('TEST-SKIP')) {
          skippedTests.add(parent);
        }
      }

      if (isNewSection) {
        // Nest the following under this section.
        parent = logIndex;
      }
    }
  }

  search(value) {
    if (!value) {
      return [];
    }
    return this.indexes.filter((logIndex) =>
      this.logLowerCase[logIndex].includes(value),
    );
  }

  /**
   * @returns {NodeIndex[]}
   */
  getRoots() {
    return this.roots;
  }

  /**
   * @param {LogIndex} logIndex
   * @returns {LogIndex[]}
   */
  getChildren(logIndex) {
    if (logIndex === -1) {
      return this.getRoots();
    }
    return this.parentToChildren.get(logIndex) || [];
  }

  /**
   * @param {LogIndex} logIndex
   * @returns {boolean}
   */
  hasChildren(logIndex) {
    return this.parentToChildren.has(logIndex);
  }

  getAllDescendants() {
    return new Set();
  }

  /**
   * @param {LogIndex} logIndex
   * @returns {LogIndex}
   */
  getParent(logIndex) {
    // There are no parents for now, so return -1.
    return this.childToParent.get(logIndex) || -1;
  }

  getDepth(logIndex) {
    return this.childToParent.has(logIndex) ? 1 : 0;
  }

  /**
   * @param {LogTree} tree
   * @returns {boolean}
   */
  hasSameNodeIds(tree) {
    return this.indexes === tree.indexes;
  }

  /**
   * @param {LogIndex} logIndex
   * @param {DisplayData}
   */
  getDisplayData(logIndex) {
    const line = this.log[logIndex];
    //                         Allow any optional whitespace at the beginning.
    //                         |   Match a string like "[taskcluster 2020-06-01 11:21:14.550Z]"
    //                         |   | Capture the word of the task
    //                         |   | |     Capture the date string
    //                         |   | |     |               Capture the rest of the message
    //                         |   | |     |               |
    //                         v   v (###) (###########)   (###)
    const result = line.match(/^\s*\[(\w+) ([\d\w- :.]+)\] (.*)/);
    //                         "    [atask 2020-06-01....] The rest of the message"
    if (!result) {
      return {
        time: null,
        log: line,
      };
    }
    // eslint-disable-next-line no-unused-vars
    const [, task, time, message] = result;
    const classNames = [this.getMessageClassName(message)];
    if (this.hasFailingChildren.has(logIndex)) {
      classNames.push('log-has-failing-test');
    }
    if (this.skippedTests.has(logIndex)) {
      classNames.push('log-has-skipped-test');
    }
    return {
      time,
      log: <span className={classNames.join(' ')}>{message}</span>,
    };
  }

  getMessageClassName(message) {
    if (message.includes('TEST-INFO')) {
      return 'log-test-info';
    }
    if (message.includes('INFO - TEST-START')) {
      return 'log-test-start';
    }
    if (message.includes('INFO - TEST-OK')) {
      return 'log-test-ok';
    }
    if (message.includes('INFO - TEST-PASS')) {
      return 'log-test-pass';
    }
    if (message.includes('INFO - SUITE-START')) {
      return 'log-suite-start';
    }
    if (message.includes('INFO - TEST-UNEXPECTED-FAIL')) {
      return 'log-test-unexpected-fail';
    }
    if (message.includes('PROCESS-CRASH')) {
      return 'log-process-crash';
    }
    if (message.includes('INFO - TEST-')) {
      return 'log-test-other';
    }
    if (message.includes('Browser Chrome Test Summary')) {
      return 'log-test-summary';
    }
    if (/((INFO -)|([\s]+))(Passed|Failed|Todo):/.test(message)) {
      return 'log-test-summary';
    }
    return '';
  }
}

/**
 * This component handles fetching the log, but not displaying it.
 */
export default class Log extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      log: null,
      error: null,
    };
  }

  componentDidMount() {
    this.fetchLog(this.props.url);
  }

  async fetchLog(url) {
    fetch(url).then(
      (response) => {
        response.text().then(
          (log) => {
            this.setState({ log: log.split('\n') });
          },
          (error) => {
            this.setState({ error: 'Unable to fetch the log.' });
            // eslint-disable-next-line no-console
            console.error(error);
          },
        );
      },
      (error) => {
        this.setState({ error: 'Unable to fetch the log.' });
        // eslint-disable-next-line no-console
        console.error(error);
      },
    );
  }

  render() {
    const { log, error } = this.state;
    if (error) {
      return error;
    }
    if (log === null) {
      return 'Loading the log';
    }
    return <LogList log={log} />;
  }
}

const emptySet = new Set();
/**
 * This component is in charge of displaying the log after it's been fetched.
 */
class LogList extends React.PureComponent {
  _fixedColumns = [{ propName: 'time', title: 'Time' }];

  _mainColumn = { propName: 'log', title: 'Log' };

  searchInput = null;

  treeView = null;

  constructor(props) {
    super(props);
    this.tree = new LogTree(props.log);
    this.state = {
      selection: [...this.tree.hasFailingChildren].sort()[0],
      findIndex: 0,
      findMatches: [],
      expandedNodeIds: [],
    };
  }

  componentDidMount() {
    window.addEventListener('keydown', this.handleKeydown);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.selection !== this.state.selection) {
      this.treeView.scrollSelectionIntoView();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeydown);
  }

  onSelectionChange = (selection) => {
    this.setState({ selection });
  };

  onExpandedNodesChange = (expandedNodeIds) => {
    this.setState({ expandedNodeIds });
  };

  onFindChange = (event) => {
    const { value } = event.target;
    const findMatches = this.tree.search(value);
    if (findMatches.length === 0) {
      return;
    }
    this.setState((state) => {
      const { selection } = state;
      // Try to find the next match after the selection.
      let findIndex = findMatches.findIndex((index) => index >= selection);
      if (findIndex === -1) {
        findIndex = 0;
      }

      return {
        findMatches,
        findIndex,
        selection: findMatches[findIndex],
        expandedNodeIds: this.expandToNode(state, selection),
      };
    });
  };

  onFindEnter = (event) => {
    if (event.key !== 'Enter') {
      return;
    }
    const direction = event.shiftKey ? -1 : 1;
    this.setState((state) => {
      const { findMatches, findIndex } = state;
      const nextFindIndex =
        (findIndex + direction + findMatches.length) % findMatches.length;
      const selection = findMatches[nextFindIndex];
      return {
        selection,
        findIndex: nextFindIndex,
        expandedNodeIds: this.expandToNode(state, selection),
      };
    });
  };

  takeSearchRef = (input) => {
    this.searchInput = input;
  };

  takeTreeViewRef = (treeView) => {
    this.treeView = treeView;
    treeView.focus();
  };

  handleKeydown = (event) => {
    if (event.code === 'KeyF' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (this.searchInput) {
        this.searchInput.focus();
        this.sarchInput.select();
      }
    }
  };

  expandToNode(state, selection) {
    let { expandedNodeIds } = state;
    {
      const parent = this.tree.childToParent.get(selection);
      if (parent !== -1) {
        expandedNodeIds = new Set(state.expandedNodeIds);
        expandedNodeIds.add(parent);
      }
    }
    return expandedNodeIds;
  }

  renderToolbar() {
    return (
      <div className="logToolbar">
        <input
          type="text"
          placeholder="search"
          ref={this.takeSearchRef}
          onChange={this.onFindChange}
          onKeyDown={this.onFindEnter}
        />
      </div>
    );
  }

  render() {
    const { selection, expandedNodeIds } = this.state;
    return (
      <div className="log">
        {this.renderToolbar()}
        <TreeView
          maxNodeDepth={1}
          tree={this.tree}
          fixedColumns={this._fixedColumns}
          mainColumn={this._mainColumn}
          onSelectionChange={this.onSelectionChange}
          onExpandedNodesChange={this.onExpandedNodesChange}
          selectedNodeId={selection}
          expandedNodeIds={expandedNodeIds}
          rowHeight={16}
          indentWidth={40}
          onEnterKey={noop}
          ref={this.takeTreeViewRef}
        />
      </div>
    );
  }
}

Log.propTypes = {
  url: PropTypes.string.isRequired,
};
