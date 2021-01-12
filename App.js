import { StatusBar } from 'expo-status-bar';
import React, { Component, UseState } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity, Image, ActivityIndicator, ImageBackground, Animated } from 'react-native';
import * as Font from 'expo-font';
import { AppLoading} from 'expo';
import { Audio } from 'expo-av';
import { GameEngine } from 'react-native-game-engine'; 
import Matter from 'matter-js';
import Constants from './Constants';
import Scepter from './Scepter';
import Floor from './Floor';
import Physics, { resetPipes, resetCoins } from './Physics';
import Images from './Images';

// https://docs.expo.io/versions/v36.0.0/sdk/local-authentication/
// https://docs.expo.io/versions/v36.0.0/sdk/local-authentication/

export default class App extends Component {
  
  constructor(props){
    super(props);
    this.gameEngine = null;
    this.entities = this.setupWorld();
    this.playbackInstance = null;
    this.coinPlaybackInstance = null;
    this.coinMusicSource = require('./assets/audio/coin1.wav')
    this.state = {
      gameStarted: false,
      running: true,
      score: 0,
      fontLoaded: false,
    }

  }


async componentDidMount(){
 await Font.loadAsync({
    '04B_19': require('./assets/fonts/04B_19.ttf'),
    });
    this.setState({ fontLoaded: true})

   Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });

    let backgroundMusic = require('./assets/audio/Menu_Music.mp3')
    this._loadNewPlaybackInstance(true,this.playbackInstance,true, backgroundMusic);
  }


  async _loadNewPlaybackInstance(playing, audioInstance, looping, sourceMusic) {
    if (audioInstance != null) {
      await audioInstance.unloadAsync();
      audioInstance.setOnPlaybackStatusUpdate(null);
      audioInstance = null;
    }
    const source = sourceMusic;
    const initialStatus = {
      shouldPlay: true,
      rate: 1.0,
      shouldCorrectPitch: true,
      volume: 1.0,
      isMuted: false,
    };

    const {sound, status } = await Audio.Sound.createAsync(
      source,
      initialStatus
    );

    audioInstance = sound;
    audioInstance.setIsLoopingAsync(looping);
    audioInstance.playAsync();
  }

  componentWillUnmount() {
    this.playbackInstance.unloadAsync();
    this.coinPlaybackInstance.unloadAsync();
    console.log('unmount');
  }


  setupWorld = () => {
      let engine = Matter.Engine.create({ enableSleeping: false});
      let world = engine.world;
      world.gravity.y = 0.0;

      let scepter = Matter.Bodies.rectangle(Constants.MAX_WIDTH / 4, Constants.MAX_HEIGHT / 2, Constants.SCEPTER_WIDTH, Constants.SCEPTER_HEIGHT, { label: 'scepter' });
    
      
      let floor1 = Matter.Bodies.rectangle(
        Constants.MAX_WIDTH / 2, 
        Constants.MAX_HEIGHT - 25, 
        Constants.MAX_WIDTH + 4, 
        50, 
        { isStatic: true, label: 'floor1' });

      let floor2 = Matter.Bodies.rectangle(
          Constants.MAX_WIDTH + (Constants.MAX_WIDTH / 2), 
          Constants.MAX_HEIGHT - 25, 
          Constants.MAX_WIDTH + 4, 
          50, 
          { isStatic: true, label: 'floor2' });


      Matter.World.add(world, [scepter, floor1, floor2] );

      Matter.Events.on(engine, "collisionStart", (event) => {
        let pairs = event.pairs;
        event.pairs.forEach((collision) => {
          console.log(collision.bodyA.label, collision.bodyB.label);
        });
        // for (var i = 0; i < pairs.length; i++) {
        //   var pair = pairs[i];
        //   console.log(pair.bodyA.label, pair.bodyB.label)
        // }
        //console.log("Collision Pair " + pairs.bodyB.label)




        this.gameEngine.dispatch({ type: "game-over"});

      });

      Matter.Events.on(engine, "collisionActive", (event) => {
        let pairs = event.pairs;
        pairs.forEach(function(obj){
          if (obj.bodyA.isSensor || obj.bodyB.isSensor) {
            console.log(obj.bodyA.label, obj.bodyB.label);
          }
        })

      });



      return {
        physics: { engine: engine, world: world },
        scepter: { body: scepter, pose: 1, renderer: Scepter },
        floor1: { body: floor1, renderer: Floor },
        floor2: { body: floor2, renderer: Floor },
        
      }
  }

 async playCoinSound() {  
  this._loadNewPlaybackInstance(true,this.coinPlaybackInstance,false,this.coinMusicSource);
  
  console.log('coin music yeeted');
 }

 onEvent = (e) => {
    if (e.type === "game-over"){
      this.setState({
        running: false
      });
    } else if (e.type === "score") {
        this.setState({
          score: this.state.score + 1
        })
        console.log(this.state.score)
    }
    else if (e.type === "closeMainMenu"){
      this.setState({
        gameStarted: true
      })
    }
    else if (e.type === "coinScore"){
      this.setState({
        score: this.state.score + 2
      })
      this.playCoinSound();
      console.log(this.state.score)
     
    }
  }

  startGame = () => {
    this.setState({
      gameStarted: true,
    })
  }

  returnToMainMenu = () => {
    resetPipes();
    resetCoins();
    this.gameEngine.swap(this.setupWorld());
    this.setState({
      gameStarted: false,
      running: true,
      score: 0,
    })
  }

  reset = () => {
      resetPipes();
      resetCoins();
      this.gameEngine.swap(this.setupWorld());
      this.setState({
        running: true,
        score: 0
      });
  }

  render() {
  if(this.state.fontLoaded){

  return (
    <View style={styles.container}>
      
      <Image source={Images.background} style={styles.backgroundImage} resizeMode="cover" />

      <GameEngine 
        ref={(ref) => { this.gameEngine = ref; }}
        style={styles.gameContainer}
        systems={[Physics]}
        running={this.state.running}
        onEvent={this.onEvent}
        entities={this.entities} 
      >
        <StatusBar hidden={true}/>
      </GameEngine>
    
      <Text style={styles.score}>{this.state.score}</Text> 
      {/* https://stackoverflow.com/questions/45263904/how-to-define-image-as-a-background-button */}
      {!this.state.gameStarted && 
        
        <View style={styles.gameMenu}>
          <ImageBackground style={styles.gameMenuBackground} source={Images.purpleMenu} resizeMode="stretch">
            
          <Text style={styles.gameMenuTitle}>Sled.IO</Text> 
            
            
            <TouchableOpacity onPress={this.startGame} style={styles.menuTouchableButton}>
              <Image
                source={Images.purpleButton}
                style={styles.menuButtonImage} 
              />
              <View style={styles.menuButtonView}>
                <Text style={styles.menuButtonText}>Tap to Start</Text>
              </View>
            </TouchableOpacity>        
          </ImageBackground>
        </View>
      
}
{/* <TouchableOpacity onPress={this.startGame} style={styles.fullScreenButton}> */}
      
      {!this.state.running && <TouchableOpacity onPress={this.reset} style={styles.fullScreenButton}>
        <View style={styles.fullScreen}>
          <Text style={styles.gameOverText}>Game Over</Text>
          <Text style={styles.gameOverSubText}>Try Again</Text>
          <TouchableOpacity onPress={this.returnToMainMenu} style={styles.menuTouchableButton}>
              <Image
                source={Images.purpleButton}
                style={styles.menuButtonImage} 
              />
              <View style={styles.menuButtonView}>
                <Text style={styles.menuButtonText}>Main Menu</Text>
              </View>
            </TouchableOpacity>  
        </View>
      </TouchableOpacity>}
    </View>
  );
  }
  else {
    return (
      <View style={styles.container}>
      <ActivityIndicator />
      <StatusBar barStyle="default" />
      </View>
    )
  }



 }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  gameMenu: {
    left: Constants.MAX_WIDTH / 10,
    top: Constants.MAX_HEIGHT / 4,
    width: Constants.MAX_WIDTH / 1.25,
    height: Constants.MAX_HEIGHT / 2,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  gameMenuTitle: {
    textAlign: 'center',
    color: 'white',
    fontSize: 72,
    textShadowColor: '#444444',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 2,
    fontFamily: '04B_19',
  },
  gameMenuBackground: {
    width: null,
    height: null,
    flex: 1,
    resizeMode: 'stretch',
    justifyContent: 'center',
    alignContent: 'center'
  },
  menuTouchableButton: {
   alignItems: 'center',
   justifyContent: 'center' 
  },
  menuButtonView: {
    position: 'absolute',
    backgroundColor: 'transparent'
  },
  menuButtonImage: {

  },
  menuButtonText: {
    color: 'white',
    fontSize: 26,
    textAlign: 'center',
    fontFamily: '04B_19',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: Constants.MAX_WIDTH,
    height: Constants.MAX_HEIGHT,
  },
  gameContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  },
  score:{
    position: 'absolute',
    color: 'white',
    fontSize: 72,
    top: 50,
    left: Constants.MAX_WIDTH /2 - 20,
    textShadowColor: '#444444',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 2,
    fontFamily: '04B_19',
  },
  fullScreenButton: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flex: 1
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'black',
    opacity: 0.8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  gameOverText: {
    color: 'white',
    fontSize: 48,
    fontFamily: '04B_19',
    textAlign: "center",
  },
  gameOverSubText: {
    color: 'white',
    fontSize: 24,
    fontFamily: '04B_19',
    textAlign: "center",
  }
});
