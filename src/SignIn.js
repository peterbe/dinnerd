import React, { Component } from 'react'
import { observer } from 'mobx-react'

import { ShowFirebaseError } from './Common'

const SignIn = observer(class SignIn extends Component {

  constructor(props) {
    super(props)
    this.state = {
      resetPassword: false,
    }
  }

  render() {

    return (
      <div className="sign-in" style={{marginTop: 40}}>
        <h3>Sign In</h3>

        {
          this.state.resetPassword ?
          <ResetPassword
            onClose={() => {
              this.setState({resetPassword: false})
            }}
            auth={this.props.auth}
          /> :
          <Login
            onUserCreated={this.props.onUserCreated}
            onClosePage={this.props.onClosePage}
            auth={this.props.auth}
          />
        }

        {
          !this.state.resetPassword ?
          <button
            style={{marginTop: 40}}
            type="button"
            className="btn btn-info btn-block"
            onClick={e => {
              this.setState({resetPassword: true})
            }}
            >
            Forgot your password?
          </button>
          : null
        }

        <button
          style={{marginTop: 40}}
          type="button"
          className="btn btn-info btn-block"
          onClick={this.props.onClosePage}
          >
          Close
        </button>
      </div>
    )
  }
})

export default SignIn


class Login extends Component {

  constructor(props) {
    super(props)
    this.state = {
      error: null,
    }
  }

  render() {
    return (
      <form onSubmit={e => {
        e.preventDefault()
        let email = this.refs.email.value.trim()
        let password = this.refs.password.value.trim()
        if (!email || !password) {
          return
        }
        this.props.auth.signInWithEmailAndPassword(email, password)
        .then(() => {
          this.props.onClosePage()
        })
        .catch((error) => {
          if (error.code === 'auth/user-not-found') {
            this.props.auth.createUserWithEmailAndPassword(email, password)
            .then(() => {
              // console.log("SUCCESSFULLY created a user account");
              this.props.onUserCreated()
              this.props.onClosePage()
            })
            .catch(error => {
              // Handle Errors here.
              this.setState({error: error})
            })
          } else {
            this.setState({error: error})
            // console.log(error);
            // var errorCode = error.code;
            // console.log('errorCode', errorCode);
            // var errorMessage = error.message;
            // console.log('errorMessage', errorMessage);
          }
        })
      }}>
        <div className="form-group">
          {/* <label htmlFor="id_email">Email address</label> */}
          <input
            type="email"
            className="form-control"
            id="id_email"
            ref="email"
            aria-describedby="emailHelp"
            placeholder="me@example.com"/>
            {/* <small id="emailHelp" className="form-text text-muted">We'll never share your email with anyone else.</small> */}
        </div>
        <div className="form-group">
          {/* <label htmlFor="id_password">Password</label> */}
          <input
            type="password"
            ref="password"
            className="form-control"
            id="id_password" placeholder="Password"/>
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-block">Sign In/Register</button>

        <ShowFirebaseError
          heading="Sign In Error :("
          error={this.state.error}/>

      </form>


    )
  }
}


class ResetPassword extends Component {

  constructor(props) {
    super(props)
    this.state = {
      error: null,
    }
  }

  render() {
    return (
      <form onSubmit={e => {
        e.preventDefault()
        let email = this.refs.email.value.trim()
        if (!email) {
          return
        }
        this.props.auth.sendPasswordResetEmail(email).then(() => {
          // XXX Flash message?!
          this.props.onClose()
        })
        .catch((error) => {
          this.setState({error: error})
        })
      }}>
        <div className="form-group">
          <label htmlFor="id_email">Email address</label>
          <input
            type="email"
            className="form-control"
            id="id_email"
            ref="email"
            aria-describedby="emailHelp"
            placeholder="me@example.com"/>
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-block">Send Password</button>
        <button
          type="button"
          className="btn btn-info btn-block"
          onClick={this.props.onClose}
        >Cancel</button>

        <ShowFirebaseError
          heading="Password Reset Error"
          error={this.state.error}/>
      </form>
    )
  }

}
