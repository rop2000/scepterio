import { StatusBar } from 'expo-status-bar';
import React, { Component, UseState } from 'react';
import { StyleSheet, Text, View, Button, Share, Alert, TouchableOpacity, Image, ActivityIndicator, ImageBackground, Animated } from 'react-native';
import * as Font from 'expo-font';
import { Audio } from 'expo-av';
import { GameEngine } from 'react-native-game-engine'; 
import Matter from 'matter-js';
import Constants from './Constants';
import Scepter from './Scepter';
import Floor from './Floor';
import  CoinsAlert from './Alert';
import Physics, { resetPipes, resetCoins } from './Physics';
import Images from './Images';
import { AdMobInterstitial } from 'expo-ads-admob';
import * as Haptics from 'expo-haptics';
import Storage from './Storage'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import AppLoading from 'expo-app-loading';


// https://docs.expo.io/versions/v36.0.0/sdk/local-authentication/
// https://docs.expo.io/versions/v36.0.0/sdk/local-authentication/

export default class App extends Component {
  
  constructor(props){
    super(props);
    this.gameEngine = null;
    this.entities = this.setupWorld();
    this.playbackInstance = null;
    this.coinPlaybackInstance = null;
    this.coinMusicSource = require('./assets/audio/coin1.wav');
    this.state = {
      gameStarted: false,
      running: true,
      score: 0,
      highscore: 0,
      coins: 0,
      fontLoaded: false,
      isReady: false,
      scoreLength: 1,
      gamesLost: 0,
      showAdView: false,
    }

  }


async componentDidMount(){
  this.readCoinData(Storage.COIN_KEY)
  this.readHighscoreData(Storage.HIGHSCORE_KEY)

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
    console.log("Styles Length " + styles.score.left)

    AdMobInterstitial.addEventListener("interstitialDidLoad", () => (setTimeout(() => {
      this.setState({ showAdView: false, running: true}),
      console.log("Open Listener Cpnnected Did Load" + "running: " + this.state.running)
    }), 1000)
    );

    AdMobInterstitial.addEventListener("interstitialWillLeaveApplication", () => (setTimeout(() => this.setState({ gamesLost: 0, running: false,}),1000)));
    AdMobInterstitial.addEventListener("interstitialDidClose", () => {
      CoinsAlert();
      this.setState({coins: this.state.coins + 50});
    });
  }

  // async _cacheResourcesAsync() {
  //   return new Promise(async(resolve) => {
  //     try {
  //       await Font.loadAsync({
  //         '04B_19': require('./assets/fonts/04B_19.ttf'),
  //         }); 
  //     } catch (error) {
  //       console.log(error)
  //     }
  //     resolve()
  //     const images = [Images.background,Images.coinbar,Images.purpleMenu,Images.purpleButton,Images.blueButton,Images.floor]
  //     const cacheImages = images.map(image => {
  //       return Asset.fromModule(image).downloadAsync();
  //     });
  //     return Promise.all(cacheImages);
  //   });
  // }
  async _cacheResourcesAsync() {
    await Promise.all([
      Asset.loadAsync([
        require('./assets/images/background.gif'),
        require('./assets/images/purple_panel.png'),
        require('./assets/images/purple_button.png'),
        require('./assets/images/blue_button.png'),
        require('./assets/images/floor_tile.png'),
        require('./assets/images/coinbar.png'),
      ]),
      Font.loadAsync({
                '04B_19': require('./assets/fonts/04B_19.ttf'),
      }), 

    ]);
  }


  async _loadNewPlaybackInstance(playing, audioInstance, looping, sourceMusic) {
    if (audioInstance != null) {
      await audioInstance.unloadAsync();
      audioInstance.setOnPlaybackStatusUpdate(null);
      audioInstance = null;
    }
    const source = sourceMusic;
    const initialStatus = {
      shouldPlay: playing,
      rate: 1.0,
      shouldCorrectPitch: true,
      volume: 0.75,
      isMuted: false,
    };

    const {sound, status } = await Audio.Sound.createAsync(
      source,
      initialStatus
    );

    audioInstance = sound;
    audioInstance.setIsLoopingAsync(looping);
    await audioInstance.playAsync();
  }

  onShare = async (message) => {
    try {
      const result = await Share.share({
        message: message,
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error) {
      alert(error.message);
    }
  };


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



        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy) 
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

 async playAd(){
  await AdMobInterstitial.setAdUnitID('ca-app-pub-6265666136721610/4800024631'); // Test ID, Replace with your-admob-unit-id
  await AdMobInterstitial.requestAdAsync({ servePersonalizedAds: true});
  await AdMobInterstitial.showAdAsync(); 
  
 }
 
 storeCoinData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key,value)
    console.log('Coin Data successfully saved')
  } catch (e) {
    console.log('Failed to save the data to the storage')
  }
}

storeHighscoreData = async (key, value) => {
  try {
    
    if (value > this.state.highscore){
      await AsyncStorage.setItem(key,value)
      this.setState({
        highscore: value
      });
      console.log('Highscore Data successfully saved')
    }
    else{
      console.log("This game's score was not the highscore")
      console.log("")
    }
    
  } catch (e) {
    console.log('Failed to save the data to the storage')
  }
}

readCoinData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key)
    if(value !== null) {
      // value previously stored
      this.state.coins = parseInt(value);
      console.log("value read " + value);
    } else {
      console.log("Read value is null")
    }
  } catch(e) {
    // error reading value
    console.log("cannot read value from storage")
  }
}

readHighscoreData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if(value !== null) {
      // value previously stored
      this.setState({
        highscore: parseInt(value)
      });

      console.log("value read " + value);
      return this.state.highscore;
    } else {
      console.log("Read value is null" + value)
      this.setState({
        highscore: 0
      });
      return 0;
    }
  } catch(e) {
    // error reading value
    console.log("cannot read value from storage")
    return 0;
  }
}

 onEvent = async (e) => {
    if (e.type === "game-over"){
      this.setState({
        gamesLost: this.state.gamesLost + 1
      });
      console.log("gamesLost: " + this.state.gamesLost);

      this.storeCoinData(Storage.COIN_KEY,this.state.coins.toString())
      if(this.state.gamesLost === 5){
        this.playAd();
        //weird error where ad makes the gamesLost go up by 2 so set at -2
        this.setState({
          showAdView: true,
          gamesLost: -2,
        });
      } else {
        this.setState({
          running: false,
        });
      }
      
    } else if (e.type === "score") {
        this.setState({
          score: this.state.score + 1
        })
        console.log(this.state.score)
     
    }
    else if (e.type === "closeMainMenu"){
      this.setState({
        gameStarted: true,
        running: true,
      })
    }
    else if (e.type === "coinScore"){
      this.setState({
        score: this.state.score + 2,
        coins: this.state.coins + 1
      })
     
      this.playCoinSound();
      console.log(this.state.score)
     
    }
  }

  AdAlert = async () =>
    Alert.alert(
      "Scepter Dash",
      "Watch An Ad For 50 Coins?",
      [
        {
          text: "No Thanks",
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel"
        },
        { text: "Ad Me Up!", onPress: async () => {await this.playAd()} }
      ],
      { cancelable: false }
    );


  scoreStyle = () => {
    console.log("Style Length " + styles.score.left);
    return {
      position: 'absolute',
      color: 'white',
      fontSize: 72,
      top: 50,
      left: Constants.MAX_WIDTH /2 - 20 - ((this.getLength(this.state.score) - 1) *20),
      textAlign: 'center',
      textShadowColor: '#444444',
      textShadowOffset: {width: 2, height: 2},
      textShadowRadius: 2,
      fontFamily: '04B_19',
    }
  }

  getLength = (number) => {
      return number.toString().length;
  }


  startGame = () => {
    this.setState({
      gameStarted: true,
    })
  }

  returnToMainMenu = () => {
    this.storeHighscoreData(Storage.HIGHSCORE_KEY,this.state.score.toString())
    resetPipes();
    resetCoins();
    this.gameEngine.swap(this.setupWorld());
    this.setState({
      gameStarted: false,
      running: true,
      score: 0,
      scoreLength: 1,
    })
  }

  reset = async () => {
      this.storeHighscoreData(Storage.HIGHSCORE_KEY,this.state.score.toString())
      resetPipes();
      resetCoins();
      this.gameEngine.swap(this.setupWorld());
      this.setState({
        running: true,
        score: 0,
        scoreLength: 1,
      });
  }

  async componentWillUnmount() {
    AdMobInterstitial.removeAllListeners();
    if (this.playbackInstance !== null) {
      await this.playbackInstance.unloadAsync();
    } 
    
    if (this.coinPlaybackInstance !== null) {
      await this.coinPlaybackInstance.unloadAsync();
    }

    console.log('unmount');
   
  }

  render() {
  if(this.state.isReady){

  return (
    <View style={styles.container}>
      
      <Image source={require('./assets/images/background.gif')} style={styles.backgroundImage} resizeMode="cover" />

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
    
      <Text style={this.scoreStyle()}>{this.state.score}</Text> 
      <Image source={Images.coinbar} style={styles.coinbar} resizeMode="stretch" />
      <Text style={styles.coinText}>{this.state.coins}</Text> 
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

            <TouchableOpacity onPress={async () => {await this.AdAlert()}} style={styles.menuTouchableButton}>
              <Image
                source={Images.purpleButton}
                style={styles.menuButtonImage} 
              />
              <View style={styles.menuButtonView}>
                <Text style={styles.menuButtonText}>MONIESSSS!</Text>
              </View>
            </TouchableOpacity> 

            


            <Text style={styles.highScore}>{"Highscore: " + this.state.highscore }</Text>        
          </ImageBackground>
        </View>
      
}

      {this.state.showAdView && 
      <TouchableOpacity onPress={this.reset} style={styles.fullScreenButton}>
      <View style={styles.fullScreen}>
              <Image
                source={Images.purpleButton}
                style={styles.menuButtonImage} 
              />
              <View style={styles.menuButtonView}>
                <Text style={styles.menuButtonText}>Ad Loading...</Text>
              </View>
            </View>
            </TouchableOpacity> }
            

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

          <TouchableOpacity onPress={async () => {await this.onShare( `I'm so kool! I just scored ${this.state.score} points in Scepter Dash! Check out the game here...`)}} style={styles.menuTouchableButton}>
              <Image
                source={Images.blueButton}
                style={styles.menuButtonImage} 
              />
              <View style={styles.menuButtonView}>
                <Text style={styles.shareButtonText}>Share Your Score!</Text>
              </View>
            </TouchableOpacity> 
            
        </View>
      </TouchableOpacity>}
    </View>
  );
  }
  else {
    return (
      <AppLoading
        startAsync={this._cacheResourcesAsync}
        onFinish={() => this.setState({ isReady: true})}
        onError={console.warn}
      />
      // <View style={styles.container}>
      // <ActivityIndicator />
      // <StatusBar barStyle="default" />
      // </View>
    );
  }



 }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    textAlign: 'center'
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
  highScore: {
    textAlign: 'center',
    color: 'white',
    fontSize: 30,
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
  shareButtonText: {
    color: 'white',
    fontSize: 20,
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
    textAlign: 'center',
    textShadowColor: '#444444',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 2,
    fontFamily: '04B_19',
  },
  coinText: {
    position: 'absolute',
    color: 'white',
    top: 63,
    fontFamily: '04B_19',
    fontSize: 30,
    left: Constants.MAX_WIDTH /1.5 + 22,
  },
  coinbar:{
    position: 'absolute',
    top: 55,
    width: Constants.COINBAR_WIDTH,
    height: Constants.COINBAR_HEIGHT,
    left: Constants.MAX_WIDTH / 1.5 - 20,
    flex: 1
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
