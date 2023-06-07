import React, {useEffect, useRef, useState} from 'react';
import {
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import io from 'socket.io-client';

import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCpeer,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from 'react-native-webrtc';

export interface RemotePeerConnection {
  [key: string]: RTCPeerConnection;
}
export interface RemotePeerConnectionStats {
  [key: string]: {timerId: number};
}

export interface RemoteDescriptionSet {
  [key: string]: boolean;
}
export interface IceCandidateList {
  [key: string]: RTCIceCandidate[];
}

const configuration = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]};

function App(): JSX.Element {
  const [info, setInfo] = useState<string>('Initializing');
  const [status, setStatus] = useState<string>('init');
  const [roomId, setRoom] = useState<string>('myroom');
  const [isFront, setIsFront] = useState<boolean>(true);
  const [url, setUrl] = useState<string | null>(null);
  const [remoteList, setRemoteList] = useState<any>({});
  const pcPeers = useRef<any>({});

  const socket = useRef<any>();

  // const getStats = () => {
  //   const pc = pcPeers.current[Object.keys(pcPeers)[0]];
  //   if (
  //     pc.getRemoteStreams()[0] &&
  //     pc.getRemoteStreams()[0].getAudioTracks()[0]
  //   ) {
  //     const track = pc.getRemoteStreams()[0].getAudioTracks()[0];
  //     let callback = report => console.log('getStats report', report);

  //     //console.log('track', track);

  //     pc.getStats(track, callback, error => {
  //       console.log('error', error);
  //     });
  //   }
  // };

  const createPC = (socketId, isOffer) => {
    console.log('🚀 ~ file: App.tsx:93 ~ createPC ~ socketId:', socketId);
    /**
     * Create the Peer Connection
     */
    if (pcPeers.current[socketId]) {
      return;
    }
    pcPeers.current[socketId] = new RTCPeerConnection(configuration);

    /**
     * (Deprecated)
     */
    // peer.addTrack(localStream.current!);

    /**
     * On Add Stream (Deprecated)
     */

    // peer.onaddstream = event => {
    //   //console.log('onaddstream', event.stream);
    //   // const remoteList = appClass.state.remoteList;

    //   // remoteList[socketId] = event.stream.toURL();
    //   // appClass.setState({
    //   //   info: 'One peer join!',
    //   //   remoteList: remoteList,
    //   // });
    //   setInfo('One peer join!');
    //   setRemoteList(s => ({...s, [socketId]: event.stream.toURL()}));
    // };

    /**
     * On Ice Candidate
     */
    pcPeers.current[socketId].addEventListener('icecandidate', event => {
      console.log('icecandidate', event.candidate);
      if (event.candidate) {
        socket.current?.emit('exchange', {
          to: socketId,
          candidate: event.candidate,
        });
      }
    });

    pcPeers.current[socketId].addEventListener(
      'connectionstatechange',
      event => {
        console.log('🚀 ~ file: App.tsx:173 ~ createPC ~ event:', event);
        switch (pcPeers.current[socketId].connectionState) {
          case 'closed':
            // You can handle the call being disconnected here.

            break;
        }
      },
    );

    pcPeers.current[socketId].addEventListener('icecandidateerror', event => {
      console.log('🚀 ~ file: App.tsx:182 ~ createPC ~ event:', event);
      // You can ignore some candidate errors.
      // Connections can still be made even when errors occur.
    });

    pcPeers.current[socketId].addEventListener(
      'iceconnectionstatechange',
      event => {
        console.log(
          '🚀 ~ file: App.tsx:187 ~ createPC ~ iceconnectionstatechange:',
          event,
          pcPeers.current[socketId].iceConnectionState,
        );
        switch (pcPeers.current[socketId].iceConnectionState) {
          case 'connected':
          case 'completed':
            // You can handle the call being connected here.
            // Like setting the video streams to visible.

            break;
        }
      },
    );

    pcPeers.current[socketId].addEventListener(
      'negotiationneeded',
      async event => {
        console.log('🚀 ~ file: App.tsx:198 ~ createPC ~ event:', event);
        // You can start the offer stages here.
        // Be careful as this event can be called multiple times.
        if (isOffer) {
          try {
            await pcPeers.current[socketId].setLocalDescription(
              await pcPeers.current[socketId].createOffer({
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true,
              }),
            );
            // send the offer to the other pcPeers.current[socketId]
            socket.current?.emit('exchange', {
              to: socketId,
              sdp: pcPeers.current[socketId].localDescription,
              type: 'offer',
            });
          } catch (err) {
            console.error(err);
          }
          // let callback = async (desc) => {
          //   log('The SDP offer', desc.sdp);

          //   await pcPeers.current[socketId].setLocalDescription(desc);
          //   callback2();
          // };
          // let callback2 = () => {
          //   //console.log('setLocalDescription', pcPeers.current[socketId].localDescription);
          //   socket.emit('exchange', {to: socketId, sdp: pcPeers.current[socketId].localDescription});
          // };

          // await pcPeers.current[socketId].createOffer(callback, logError);
        }
      },
    );

    pcPeers.current[socketId].addEventListener(
      'signalingstatechange',
      event => {
        console.log('🚀 ~ file: App.tsx:203 ~ createPC ~ event:', event);
        switch (pcPeers.current[socketId].signalingState) {
          case 'closed':
            // You can handle the call being disconnected here.

            break;
        }
      },
    );

    pcPeers.current[socketId].addEventListener('track', event => {
      console.log('🚀 ~ file: App.tsx:212 ~ createPC ~ event:', event);
      // Grab the remote track from the connected participant.
      // remoteMediaStream.current =
      //   remoteMediaStream.current || new MediaStream();
      // remoteMediaStream.current?.addTrack(
      //   event.track,
      //   remoteMediaStream.current,
      // );
      setRemoteList(s => {
        const remoteMediaSteam = s[socketId] || event.streams[0];
        console.log(
          '🚀 ~ file: App.tsx:213 ~ createPC ~  event.streams[0]:',
          event.streams[0]._tracks,
        );
        // if (!s[socketId]) {
        //   event.streams[0]?.getTracks().forEach(track => {
        //     remoteMediaSteam.addTrack(track);
        //   });
        //   console.log(
        //     '🚀 ~ file: App.tsx:214 ~ event.streams[0]?.getTracks ~ event.streams[0]?.getTracks():',
        //     event.streams[0]?.getTracks(),
        //   );
        // }
        return {
          ...s,
          [socketId]: remoteMediaSteam,
        };
      });
    });

    // Add our stream to the pcPeers.current[socketId] connection.
    localStream.current
      ?.getTracks()
      .forEach(track =>
        pcPeers.current[socketId].addTrack(track, localStream.current!),
      );
    console.log(
      '🚀 ~ file: App.tsx:225 ~ createPC ~ localStream.current?.getTracks():',
      localStream.current?.getTracks(),
    );

    return pcPeers.current[socketId];
  };

  useEffect(() => {
    socket.current = io('http://10.3.144.139:4443', {
      transports: ['websocket'],
    });
    console.log(
      '🚀 ~ file: App.tsx:198 ~ useEffect ~ socket.current:',
      socket.current,
    );
    socket.current.on('error', err => {
      console.log('error:', err);
    });
    socket.current.on('connect', () => {
      console.log('connect');
    });

    const exchange = async (data: any) => {
      console.log('🚀 ~ file: App.tsx:277 ~ exchange ~ data:', data);
      let fromId = data.from;

      if (data.sdp) {
        // log('Exchange', data);
      }

      let peer;
      if (fromId in pcPeers.current) {
        peer = pcPeers.current[fromId];
      } else {
        peer = createPC(fromId, false);
      }

      if (data.sdp) {
        //console.log('exchange sdp', data);
        let sdp = new RTCSessionDescription(data.sdp);

        // let callback = () =>
        //   peer.remoteDescription.type === 'offer'
        //     ? peer.createAnswer(callback2, logError)
        //     : null;
        // let callback2 = (desc) =>
        //   peer.setLocalDescription(desc, callback3, logError);
        // let callback3 = () =>
        //   socket.emit('exchange', {to: fromId, sdp: peer.localDescription});

        // peer.setRemoteDescription(sdp, callback, logError);
        if (data.type === 'offer') {
          await peer.setRemoteDescription(sdp);
          await peer.setLocalDescription(await peer.createAnswer());
          socket.current.emit('exchange', {
            to: fromId,
            sdp: peer.localDescription,
            type: 'answer',
          });
        } else if (data.type === 'answer') {
          await peer.setRemoteDescription(sdp);
        }
      } else {
        peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    socket.current.on('exchange', data => {
      exchange(data);
    });

    const leave = socketId => {
      //console.log('leave', socketId);

      const peer = pcPeers.current[socketId];

      peer.close();

      delete pcPeers.current[socketId];

      // const remoteList = appClass.state.remoteList;

      // delete remoteList[socketId];

      // appClass.setState({
      //   info: 'One peer left!',
      //   remoteList: remoteList,
      // });
    };

    socket.current.on('leave', socketId => {
      leave(socketId);
    });

    return () => {
      if (!socket.current.disconnected) {
        socket.current.disconnect();
      }
    };
  }, []);

  const localStream = useRef<MediaStream>();

  useEffect(() => {
    mediaDevices.enumerateDevices().then((sourceInfos: any) => {
      // console.log(sourceInfos);
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (
          sourceInfo.kind == 'videoinput' &&
          sourceInfo.facing == (isFront ? 'front' : 'environment')
        ) {
          videoSourceId = sourceInfo.deviceId;
        }
      }
      mediaDevices
        .getUserMedia({
          audio: true,
          video: true,
          // video: {
          //   mandatory: {
          //     minWidth: 500, // Provide your own width, height and frame rate here
          //     minHeight: 300,
          //     minFrameRate: 30,
          //   },
          //   facingMode: isFront ? 'user' : 'environment',
          //   optional: videoSourceId ? [{sourceId: videoSourceId}] : [],
          // },
        })
        .then(stream2 => {
          console.log(
            '🚀 ~ file: App.tsx:441 ~ mediaDevices.enumerateDevices ~ stream2:',
            stream2.toURL(),
          );

          // Got stream!
          localStream.current = stream2;

          setUrl(stream2.toURL());
          setStatus('ready');
          setInfo('Welcome to WebRTC demo');
        })
        .catch(error => {
          // Log error
        });
    });
  }, [isFront]);

  const join = roomID => {
    let onJoin = socketIds => {
      console.log('🚀 ~ file: App.tsx:339 ~ onJoin ~ socketIds:', socketIds);
      for (const i in socketIds) {
        if (socketIds.hasOwnProperty(i)) {
          const socketId = socketIds[i];
          createPC(socketId, true);
        }
      }
    };

    socket.current.emit('join', roomID, onJoin);
  };

  return (
    <SafeAreaView style={styles.body}>
      <Text>{info}</Text>
      {status === 'ready' ? (
        <Button
          title="Enter room"
          onPress={() => {
            join(roomId);
          }}
        />
      ) : null}
      {url && <RTCView streamURL={url} style={styles.rtc_view} />}
      {/* <View style={styles.footer}> */}
      {/* <Button title="Start" onPress={start} /> */}
      {/* <Button title="Stop" onPress={stop} /> */}
      {/* </View> */}
      {Object.values(remoteList).map((remote, index) => {
        console.log(
          '🚀 ~ file: App.tsx:471 ~ {mapHash ~ remote:',
          remote.toURL(),
        );
        return (
          <RTCView
            key={index}
            streamURL={remote.toURL()}
            style={styles.rtc_view}
          />
        );
      })}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    ...StyleSheet.absoluteFillObject,
  },
  stream: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  rtc_view: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    // height: 150,
    margin: 10,
    // backgroundColor: 'red',
  },
});

export default App;
