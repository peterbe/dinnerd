import React, { Component } from 'react'
import { observer } from 'mobx-react'

import store from './Store'
import { ShowFirebaseError } from './Common'

const User = observer(class User extends Component {

  constructor(props) {
    super(props)
    this.state = {changePassword: false}
  }

  render() {
    return (
      <div className="user" style={{marginTop: 40}}>
        <h3>User</h3>

        <dl className="row">
          {/* <dt className="col-sm-3">Name</dt> */}
          {/* <dd className="col-sm-9">{ store.currentUser.displayName }</dd> */}
          <dt className="col-sm-3">Email</dt>
          <dd className="col-sm-9">{ store.currentUser.email }</dd>
          <dt className="col-sm-3">Email Verified?</dt>
          <dd className="col-sm-9">{ store.currentUser.emailVerified ? 'Yes' : 'Not yet' }</dd>
        </dl>

        {
          this.state.changePassword ?
          <ChangePassword
            user={this.props.user}
            onClose={() => {
              this.setState({changePassword: false})
            }}
           />
          : null
        }

        <button
          type="button"
          className="btn btn-info btn-block"
          onClick={this.props.onSignOut}
          >
          Sign out
        </button>
        <button
          type="button"
          className="btn btn-info btn-block"
          onClick={e => {
            this.setState({changePassword: !this.state.changePassword})
          }}
          >
          Change your password
        </button>
        <button
          type="button"
          className="btn btn-info btn-block"
          onClick={e => {
            store.currentUser.getToken().then(t => {
              console.warn('Access Token', t)
              prompt(t)
            })
          }}
          >
          Get your Access Token
        </button>

        <button
          type="button"
          className="btn btn-primary btn-block close-button"
          onClick={this.props.onClosePage}
          >
          Close
        </button>
      </div>
    )
  }
})

export default User


class ChangePassword extends Component {

  constructor(props) {
    super(props)
    this.state = {misMatched: false}
  }

  render() {
    return (
      <form
        style={{marginBottom: 60, marginTop: 40}}
        onSubmit={e => {
        e.preventDefault()
        let pv = this.refs.password.value
        let pv2 = this.refs.password2.value
        if (pv !== pv2) {
          this.setState({misMatched: true})
        } else {
          if (this.state.misMatched) {
            this.setState({misMatched: false})
          }
          if (this.state.error) {
            this.setState({error: null})
          }
          this.props.user.updatePassword(pv).then(() => {
            // XXX flash message?
            this.props.onClose()
            // Update successful.
            // this.setState({changePassword: false})
          }, error => {
            // An error happened.
            console.error(error);
            this.setState({error: error})
          })
        }
      }}>
        <h3>Change Your Password</h3>
        <ShowFirebaseError
          heading="Error Changing Password"
          error={this.state.error}/>

        <div className="form-group">
          <label htmlFor="id_password">New Password</label>
          <input
            type="password"
            ref="password"
            className="form-control"
            id="id_password" placeholder="Password"/>
        </div>
        <div
          className={this.state.misMatched ? 'form-group has-danger': 'form-group'}>
          <label htmlFor="id_password2">Password Again</label>
          <input
            type="password"
            ref="password2"
            className={this.state.misMatched ? 'form-control form-control-danger' : 'form-control'}
            id="id_password2" placeholder="Password repeated"/>
          {
            this.state.misMatched ?
            <div className="form-control-feedback">Mismatched</div>
            : null
          }
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-block"
          >
          Save
        </button>
        <button
          type="button"
          className="btn btn-info btn-block"
          onClick={e => {
            this.props.onClose()
          }}
          >
          Cancel
        </button>
      </form>
    )
  }

}
