import React, { Component } from 'react'
import { observer } from 'mobx-react'

import store from './Store'
import { ShowFirebaseError } from './Common'

const randomGroupCode = function(noNumbers = 4, noLetters = 2) {
  // skipping I and O since they look like 1 and 0
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  // skipping 1 and 0 since they look like I and O
  const numbers = '23456789'
  let code = ''
  for (var i = 0; i < noLetters; i++) {
    code += letters[Math.floor(Math.random() * letters.length)]
  }
  for (i = 0; i < noNumbers; i++) {
    code += numbers[Math.floor(Math.random() * numbers.length)]
  }
  return code
}


const Group = observer(class Group extends Component {

  constructor(props) {
    super(props)
    this.state = {
      changeGroup: false,
      otherGroups: null,
      codes: null,
    }
  }

  componentDidMount() {
    this.fetchCurrentGroupCodes()
    this.fetchOtherGroups()
  }

  fetchCurrentGroupCodes() {
    if (store.currentGroup && store.settings.defaultGroupId) {
      const { database } = this.props
      database.ref('/group-codes')
      .once('value')
      .then(snapshot => {
        let codes = []
        snapshot.forEach(child => {
          let childData = child.val()
          if (childData.group === store.settings.defaultGroupId) {
            codes.push(childData.code)
          }
        })
        if (codes.length) {
          this.setState({codes: codes})
        }
      })
    }
  }

  fetchOtherGroups() {
    const { database } = this.props
    // if (store.currentGroup && store.settings.defaultGroupId) {
      database.ref('/user-groups/' + store.currentUser.uid)
      .once('value')
      .then(snapshot => {
        let otherGroups = []
        snapshot.forEach(function(child) {
          var childData = child.val()
          if (
            !store.settings.defaultGroupId ||
            childData.group !== store.settings.defaultGroupId
          ) {
            otherGroups.push({
              id: childData.group,
              name: childData.name,
              membership: childData.membership,
            })
          }
        })
        if (otherGroups.length) {
          if (!store.currentGroup && otherGroups.length === 1) {
            store.currentGroup = otherGroups[0]
            store.setSetting('defaultGroupId', otherGroups[0].id)
            this.fetchOtherGroups()
          } else {
            this.setState({otherGroups: otherGroups})
          }
        }
      })
  }

  render() {
    return (
      <div className="user" style={{marginTop: 40}}>
        <h3>Group</h3>

        <p>
          Everything you save has to belong to a group. <br/>
          It can be just you in the group.
        </p>

        {
          store.currentGroup ?
          <h5>You're currently in the <i>{ store.currentGroup.name }</i> group.</h5>
          : null
        }

        {
          this.state.codes ?
          <ManageGroupCodes codes={this.state.codes}/>
          : null
        }

        {
          this.state.otherGroups ?
          <ListOtherGroups
            joinOtherGroup={group => {
              store.currentGroup = group
              store.setSetting('defaultGroupId', group.id)
              this.fetchOtherGroups()
              this.fetchCurrentGroupCodes()
              this.props.onDefaultGroupChanged()
            }}
            otherGroups={this.state.otherGroups}/>
          : null
        }

        {
          this.state.changeGroup || !store.currentGroup ?
          <JoinCreateGroup
            database={this.props.database}
            updateCurrentGroupCode={code => {
              let codes = this.state.codes || []
              codes.push(code)
              this.setState({codes: codes})
            }}
            onClose={() => {
              this.setState({changeGroup: false})
            }}
            /> :
          <em></em>
        }

        {
          this.state.joinOtherGroup ?
          <JoinOtherGroup
            database={this.props.database}
            onClose={() => {
              this.setState({joinOtherGroup: false})
            }}
          /> :
          <button
            type="button"
            className="btn btn-info btn-block"
            onClick={e => {
              this.setState({joinOtherGroup: true})
            }}
            >
            Join Other Group
          </button>
        }

        <button
          type="button"
          className="btn btn-info btn-block close-button"
          onClick={this.props.onClosePage}
          >
          Close
        </button>
      </div>
    )
  }
})

export default Group


class JoinCreateGroup extends Component {

  constructor(props) {
    super(props)
    this.state = {
      createError: null,
      joinError: null,
    }
  }

  render() {

    const { database } = this.props

    return (
      <div>
        <form
          style={{marginBottom: 60, marginTop: 40}}
          onSubmit={e => {
          e.preventDefault()
          let name = this.refs.name.value.trim()

          if (!name) {
            return
          }
          const newGroupCode = randomGroupCode()
          const newPostKey = database.ref('groups').push().key
          database.ref('groups/' + newPostKey).set({
            name: name,
            members: {},  // will be filled in soon
            // codes: [newGroupCode],
            days: [],
          }).then(() => {
            // add yourself to the group
            let updates = {}
            updates[store.currentUser.uid] = 'owner'
            database.ref('groups/' + newPostKey + '/members')
            .update(updates)
            .then(() => {
              database.ref('user-groups/' + store.currentUser.uid).push({
                group: newPostKey,
                name: name,
              })
              store.currentGroup = {
                id: newPostKey,
                name: name,
                membership: 'owner',
              }
              store.setSetting('defaultGroupId', newPostKey)
              this.props.updateCurrentGroupCode(newGroupCode)
              database.ref('group-codes').push({
                code: newGroupCode,
                group: newPostKey,
                name: name,
              })
              this.props.onClose(true)
            })
            .catch(error => {
              this.createError = error
            })
          })
          .catch(error => {
            this.createError = error
          })
        }}>
          <h5>Create New Group</h5>

          <div
            className={this.state.createError ? 'form-group has-danger': 'form-group'}>
            <input
              type="text"
              ref="name"
              className="form-control"
              id="id_name" placeholder="Name..."/>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            >
            Create
          </button>

          <ShowFirebaseError
            heading="Error Creating Group"
            error={this.state.createError}/>

        </form>

        <form
          style={{marginBottom: 60, marginTop: 40}}
          onSubmit={e => {
          e.preventDefault()
          let code = this.refs.code.value.trim()

          if (!code) {
            return
          }


        }}>
          <h5>Join Group</h5>
          <div
            className={this.state.joinError ? 'form-group has-danger': 'form-group'}>
            <input
              type="password"
              ref="code"
              className={this.state.joinError ? 'form-control form-control-danger' : 'form-control'}
              id="id_code" placeholder="Join code (not case sensitive)"/>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            >
            Join
          </button>
        </form>

        {/* <button
          type="button"
          className="btn btn-info btn-block"
          onClick={e => {
            this.props.onClose()
          }}
          >
          Cancel
        </button> */}
      </div>
    )
  }
}

class JoinOtherGroup extends Component {

  constructor(props) {
    super(props)
    this.state = {
      joinError: null,
      notFound: false,
    }
  }

  render() {

    const { database } = this.props

    return (
      <div>
        <form
          style={{marginBottom: 60, marginTop: 40}}
          onSubmit={e => {
          e.preventDefault()
          let code = this.refs.code.value.trim()

          if (!code) {
            return
          }
          code = code.toUpperCase()
          database.ref('group-codes')
          .once('value')
          .then(snapshot => {
            let found = false
            snapshot.forEach(child => {
              // var childKey = child.key;
              var childData = child.val();
              if (childData.code === code) {
                found = true
                if (this.state.notFound) {
                  this.setState({notFound: false})
                }
                // We've found the group we want to join
                // Append to its list of members
                let updates = {}
                updates[store.currentUser.uid] = 'member'
                database.ref('groups/' + childData.group + '/members')
                .update(updates)
                .then(() => {
                  // remember this as the current group
                  store.currentGroup = {
                    id: childData.group,
                    name: childData.name,
                  }
                  store.setSetting('defaultGroupId', childData.group)
                  // Update user-groups
                  database.ref('user-groups/' + store.currentUser.uid)
                  .push({
                    group: childData.group,
                    name: childData.name,
                  })
                })
                this.props.onClose()
              }
            })
            if (!found) {
              this.setState({notFound: true})
            }
          }, error => {
            console.error(error);
          })
          // const newGroupCode = randomGroupCode()
          // const newPostKey = database.ref('groups').push().key
          // database.ref('groups/' + newPostKey).set({
          //   name: name,
          //   members: {},  // will be filled in soon
          //   codes: [newGroupCode],
          //   days: [],
          // }).then(() => {
          //   // add yourself to the group
          //   let updates = {}
          //   updates[store.currentUser.uid] = 'owner'
          //   database.ref('groups/' + newPostKey + '/members')
          //   .update(updates)
          //   .then(() => {
          //     database.ref('user-groups/' + store.currentUser.uid).push(newPostKey)
          //     store.currentGroup = {
          //       id: newPostKey,
          //       name: name
          //     }
          //     store.setSetting('defaultGroupId', newPostKey)
          //     this.props.updateCurrentGroupCode(newGroupCode)
          //     this.props.onClose(true)
          //   })
          //   .catch(error => {
          //     this.createError = error
          //   })
          // })
          // .catch(error => {
          //   this.createError = error
          // })
        }}>
          <h4>Join Other Group</h4>
          <div
            className={this.state.joinError || this.state.notFound ? 'form-group has-danger': 'form-group'}>
            <input
              type="text"
              ref="code"
              className={this.state.joinError || this.state.notFound ? 'form-control form-control-danger' : 'form-control'}
              id="id_code" placeholder="Join code (not case sensitive)"/>
            {
              this.state.notFound ?
              <div className="form-control-feedback">
                Group not found
              </div>
              : null
            }
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            >
            Join
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
      </div>
    )
  }
}


const ManageGroupCodes = ({ codes }) => {
  return (
    <div className="group-codes">
      <p>To invite others into this group, give them one of these codes:</p>
      <ul>
        {
          codes.map(code => {
            return <li key={code}><code>{ code }</code></li>
          })
        }
      </ul>
    </div>
  )
}

const ListOtherGroups = ({ otherGroups, joinOtherGroup }) => {
  return (
    <div className="other-groups">
      <h5>Your Groups</h5>
      {
        otherGroups.map(group => {
          return (
            <button key={group.id}
              className="btn btn-info btn-block"
              onClick={e => {
                joinOtherGroup(group)
              }}
            >
              { group.name }
            </button>
          )
        })
      }
    </div>
  )
}
