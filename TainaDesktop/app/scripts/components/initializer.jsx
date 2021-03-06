import React from 'react';
import Router from 'react-router';
import logger from 'winston';

module.exports.create = (taina) => {
  const Login = React.createClass({
    mixins: [Router.Navigation],

    handleSubmit(e) {
      e.preventDefault();
      const masterKey = React.findDOMNode(this.refs.masterKey);
      taina.login(masterKey.value.trim()).then(() => {
        logger.info('Created new Taina');
        masterKey.value = null;
        this.transitionTo('/dashboard');
      }).catch(err => {
        logger.error(err);
      });
    },

    render() {
      if (!taina.isEmpty()) {
        this.transitionTo('/login');
      }
      return (
        <form onSubmit={this.handleSubmit}>
          <div className="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
            <input className="mdl-textfield__input" type="password" ref="masterKey" id="password" />
            <label className="mdl-textfield__label" htmlFor="password">Password</label>
          </div>
          <input type="submit" value="Login" />
        </form>
      );
    },
  });

  return Login;
};
