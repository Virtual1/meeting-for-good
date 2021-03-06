import React from 'react';
import autobind from 'autobind-decorator';
import cssModules from 'react-css-modules';
import { Card, CardTitle, CardText } from 'material-ui/Card';
import Snackbar from 'material-ui/Snackbar';
import PropTypes from 'prop-types';

import DeleteModal from '../../components/DeleteModal/DeleteModal';
import AvailabilityGrid from '../AvailabilityGrid/AvailabilityGrid';
import styles from './event-details-component.css';
import ParticipantsList from '../../components/ParticipantsList/ParticipantsList';
import BestTimesDisplay from '../../components/BestTimeDisplay/BestTimeDisplay';
import SelectedDatesEditor from '../../components/SelectedDatesEditor/SelectedDatesEditor';

class EventDetailsComponent extends React.Component {
  constructor(props) {
    super(props);
    const eventParticipantsIds = props.event.participants.map(
      participant => participant.userId._id,
    );
    const { event } = props;

    const ranges = event.dates.map(({ fromDate, toDate }) => ({
      from: new Date(fromDate),
      to: new Date(toDate),
    }));

    const dates = event.dates.map(({ fromDate, toDate }) => ({
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    }));

    this.state = {
      event,
      ranges,
      dates,
      eventParticipantsIds,
      showHeatmap: false,
      myAvailability: [],
      showButtonAviability: 'none',
      showAvailabilityGrid: 'block',
      isParticipant: true,
      snackBarOpen: false,
      snackBarMsg: '',
      heightlightedUser: '',
    };
  }

  async componentWillMount() {
    const { curUser, event } = this.props;
    if (curUser) {
      let showHeatmap = false;
      let showAvailabilityGrid = 'block';
      let myAvailability = [];

      // find actual user participant record
      const isCurParticipant = event.participants.find(participant =>
        participant.userId._id === curUser._id,
      );
      // if curUser have aviability show heatMap
      if (isCurParticipant) {
        if (isCurParticipant.availability) {
          myAvailability = isCurParticipant.availability;
          if (myAvailability.length > 0) {
            showHeatmap = true;
            showAvailabilityGrid = 'none';
          }
        }
      } else {
        showHeatmap = false;
        showAvailabilityGrid = 'block';
        this.setState({
          isParticipant: false,
          snackBarOpen: true,
          snackBarMsg: 'Please add your availability to join the event.',
        });
      }
      this.setState({ showHeatmap, showAvailabilityGrid, myAvailability });
    }
  }

  componentWillReceiveProps(nextProps) {
    const dates = nextProps.event.dates.map(({ fromDate, toDate }) => ({
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    }));
    this.setState({ event: nextProps.event, dates });
  }

  async sendEmailOwner(event) {
    const response = this.props.cbHandleEmailOwner(event);
    if (!response) {
      console.log('sendEmailOwner error');
    }
  }

  async sendEmailOwnerEdit(event) {
    const response = this.props.cbHandleEmailOwnerEdit(event);
    if (!response) {
      console.log('sendEmailOwnerEdit error');
    }
  }

  @autobind
  showAvailability() {
    this.setState({ showButtonAviability: 'hidden', showAvailabilityGrid: 'block' });
  }

  @autobind
  closeGrid() {
    this.setState({ showHeatmap: true, showAvailabilityGrid: 'none' });
  }

  @autobind
  editAvail() {
    this.setState({ showHeatmap: false, showButtonAviability: 'none', showAvailabilityGrid: 'block' });
  }

  @autobind
  async submitEditDates(patches) {
    const { event } = this.props;
    try {
      const responseEvent = await this.props.cbEditEvent(patches, event._id);
      this.setState({ event: responseEvent });
    } catch (err) {
      console.log('err at submitEditDates, EventDtailComponent', err);
    }
  }

  @autobind
  async submitAvailability(patches) {
    const { event, curUser } = this.props;
    const oldMe = event.participants.find(participant =>
      participant.userId._id === curUser._id,
    );
    const responseEvent = await this.props.cbEditEvent(patches, event._id);
    if (responseEvent) {
      const me = responseEvent.participants.find(participant =>
        participant.userId._id === curUser._id,
      );
      this.setState({
        showHeatmap: true,
        event: responseEvent,
        participants: responseEvent.participants,
        myAvailability: me.availability,
      });
      if (curUser._id !== event.owner) {
        if (oldMe.status === 3) {
          // send email edit
          await this.sendEmailOwnerEdit(responseEvent);
        } else {
          await this.sendEmailOwner(responseEvent);
        }
      }
      return responseEvent;
    }
    console.log('Error at EventDetailComponent submitAvailability');
  }

  @autobind
  handleShowInviteGuestsDrawer() {
    const { event } = this.state;
    this.props.showInviteGuests(event);
  }

  @autobind
  handleDelete() {
    const { event } = this.state;
    this.props.cbDeleteEvent(event._id);
  }

  @autobind
  async handleDeleteGuest(guestToDelete) {
    const nEvent = await this.props.cbDeleteGuest(guestToDelete);
    this.setState({ event: nEvent });
    return nEvent;
  }

  @autobind
  handleSnackBarRequestClose() {
    this.setState({
      snackBarOpen: false,
    });
  }

  @autobind
  handleOnMouseOverPrtcList(guest) {
    this.setState({ heightlightedUser: guest });
  }

  @autobind
  handleOnMouseLeavePrtcList() {
    this.setState({ heightlightedUser: '' });
  }

  render() {
    const {
      event, showHeatmap, dates, snackBarOpen, snackBarMsg, heightlightedUser,
    } = this.state;
    const { curUser } = this.props;
    let isOwner;
    // check if the curUser is owner
    if (curUser !== undefined) {
      isOwner = event.owner === curUser._id;
    }

    const inLineStyles = {
      snackBar: {
        border: '5px solid #fffae6',
        contentSyle: {
          fontSize: '16px',
          textAlign: 'center',
        },
      },
    };

    return (
      <div styleName="wrapper">
        <div>
          <Card styleName="card">
            {isOwner ? <DeleteModal event={event} cbEventDelete={this.handleDelete} /> : null}
            <CardTitle styleName="cardTitle">{event.name}</CardTitle>
            <CardText>
              <BestTimesDisplay event={event} disablePicker />
              {isOwner ?
                <SelectedDatesEditor
                  event={event}
                  submitDates={this.submitEditDates}
                /> : null}
              <AvailabilityGrid
                event={event}
                curUser={curUser}
                dates={dates}
                editAvail={this.editAvail}
                submitAvail={this.submitAvailability}
                showHeatmap={showHeatmap}
                closeEditorGrid={this.closeGrid}
                heightlightedUser={heightlightedUser}
              />
              <br />
              <ParticipantsList
                event={event}
                curUser={curUser}
                showInviteGuests={this.handleShowInviteGuestsDrawer}
                cbDeleteGuest={this.handleDeleteGuest}
                cbOnChipMouseOver={guest => this.handleOnMouseOverPrtcList(guest)}
                cbOnChipMouseLeave={guest => this.handleOnMouseLeavePrtcList(guest)}
              />
            </CardText>
          </Card>
        </div>
        <Snackbar
          style={inLineStyles.snackBar}
          bodyStyle={{ height: 'flex' }}
          contentStyle={inLineStyles.snackBar.contentSyle}
          open={snackBarOpen}
          message={snackBarMsg}
          action="dismiss"
          autoHideDuration={5000}
          onRequestClose={this.handleSnackBarRequestClose}
          onActionTouchTap={this.handleSnackBarRequestClose}
        />
      </div>
    );
  }
}

EventDetailsComponent.propTypes = {
  showInviteGuests: PropTypes.func.isRequired,
  cbDeleteEvent: PropTypes.func.isRequired,
  cbEditEvent: PropTypes.func.isRequired,
  cbHandleEmailOwner: PropTypes.func.isRequired,
  cbHandleEmailOwnerEdit: PropTypes.func.isRequired,
  cbDeleteGuest: PropTypes.func.isRequired,

  // Current user
  curUser: PropTypes.shape({
    _id: PropTypes.string,      // Unique user id
    name: PropTypes.string,     // User name
    avatar: PropTypes.string,   // URL to image representing user(?)
  }).isRequired,

  // Event containing list of event participants
  event: PropTypes.shape({
    _id: PropTypes.string,
    name: PropTypes.string,
    owner: PropTypes.string,
    active: PropTypes.bool,
    selectedTimeRange: PropTypes.array,
    dates: PropTypes.arrayOf(PropTypes.shape({
      fromDate: PropTypes.string,
      toDate: PropTypes.string,
      _id: PropTypes.string,
    })),
    participants: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.shape({
        id: PropTypes.string,
        avatar: PropTypes.string,
        name: PropTypes.string,
        emails: PropTypes.arrayOf(PropTypes.string),
      }),
      _id: PropTypes.string,
      status: PropTypes.oneOf([0, 1, 2, 3]),
      emailUpdate: PropTypes.bool,
      ownerNotified: PropTypes.bool,
      availability: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)),
    })),
  }).isRequired,
};

export default cssModules(EventDetailsComponent, styles);
