import Matter from 'matter-js';
import Constants from './Constants';
import Pipe from './Pipe';
import PipeTop from './PipeTop';
import Coin from './Coin';
import * as Haptics from 'expo-haptics';


let tick = 0;
let pose = 1;
let coinPose = 1;
let pipes = 0;
let coinsDelete = false;
let pipe1Y = 0;
let pipe2Y = 0;
let pipe1X = 0;

const randomBetween = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
//(a,b) point we are tracking (scepter)
//(x,y) center of circle (the coin)
//r is radius
const checkPointInRadius = (a, b, x, y, r) => {
    var dist_points = (a - x) * (a - x) + (b - y) * (b - y);
    r *= r;
    if (dist_points < r) {
        return true;
    }
    return false;
}

const pipesValueChecker = () => {
    let valueChecker = pipes / 2;
    if (valueChecker % 2 === 0){
        return true
    }
    else {
        return false
    }
}

export const resetPipes = () => {
    pipes = 0;
}

export const resetCoins = () => {
    coinsDelete = true;
}

export const generatePipes = () => {
  let topPipeHeight = randomBetween(100, (Constants.MAX_HEIGHT / 2) - 100);
  let bottomPipeHeight = Constants.MAX_HEIGHT - topPipeHeight - Constants.GAP_SIZE;

  let sizes = [topPipeHeight, bottomPipeHeight]

  if (Math.random() < 0.5) {
    sizes = sizes.reverse();
  }

  return sizes;
}

export const addPipesAtLocation = (x, world, entities) => {

    let [pipe1Height, pipe2Height] = generatePipes();

    let pipeTopWidth = Constants.PIPE_WIDTH + 20;
    let pipeTopHeight = (pipeTopWidth / 48) + 48

    pipe1Height =  pipe1Height - pipeTopHeight;

    let pipe1Top = Matter.Bodies.rectangle(
        x,
        pipe1Height + (pipeTopHeight / 2),
        pipeTopWidth,
        pipeTopHeight,
        { isStatic: true, label: 'pipe'}
    );

    let pipe1 = Matter.Bodies.rectangle(
        x,
        pipe1Height / 2,
        Constants.PIPE_WIDTH,
        pipe1Height,
        { isStatic: true, label: 'pipe'}
    );

    pipe2Height =  pipe2Height - pipeTopHeight;

    let pipe2Top = Matter.Bodies.rectangle(
        x,
        Constants.MAX_HEIGHT - pipe2Height - (pipeTopHeight / 2),
        pipeTopWidth,
        pipeTopHeight,
        { isStatic: true, label: 'pipe'}
    );

    let pipe2 = Matter.Bodies.rectangle(
        x,
        Constants.MAX_HEIGHT - 50 - (pipe2Height / 2),
        Constants.PIPE_WIDTH,
        pipe2Height,
        { isStatic: true, label: 'pipe'}
    );


        //here we add the pipes to the world 
        //and to the entities object
    Matter.World.add(world, [pipe1, pipe2, pipe1Top, pipe2Top]);

    entities["pipe"+ (pipes + 1)] = {
        body: pipe1, renderer: Pipe, scored: false
    }

    entities["pipe"+ (pipes + 2)] = {
        body: pipe2, renderer: Pipe, scored: false
    }
    
    entities["pipe"+ (pipes + 1) + "Top"] = {
        body: pipe1Top, renderer: PipeTop, scored: false
    }
    
    entities["pipe"+ (pipes + 2) + "Top"] = {
        body: pipe2Top, renderer: PipeTop, scored: false
    }
    
  
    if (pipesValueChecker()){
    pipe1Y = pipe1Height + (pipeTopHeight / 2)
    pipe2Y = Constants.MAX_HEIGHT - pipe2Height - (pipeTopHeight / 2)
    pipe1X = x;
    }
    pipes += 2;

    console.log("PipesValue " + pipes)
    console.log("pipe1y " + pipe1Y)
    console.log("pipe2y " + pipe2Y)
    console.log("pipe1x " + pipe1X)
}

export const generateCoins = (num,topPipeY, bottomPipeY, pipeXPos, world, entities) => {
    numCoins = num;
    coinList = [];
    let coinPos = pipeXPos + Constants.COIN_WIDTH;
    //blank list for coins
    for(i = 1; i <= numCoins; i++){

        let coin = Matter.Bodies.rectangle(
            coinPos,
            (topPipeY + bottomPipeY) / 2,
            Constants.COIN_WIDTH,
            Constants.COIN_WIDTH,
            { isStatic: false, isSensor: true, label: 'coin'}
        );
      
        console.log("Coin Position " + ((topPipeY + bottomPipeY) / 2))    
        coinList["coin" + i] = coin;
        entities["coin"+ i] = {
            body: coin, renderer: Coin
        }
       // console.log(coinList["coin" + i])
        coinPos += Constants.COIN_GAP;
    }
    
    Matter.World.add(world, coinList);
    console.log("coin generated");
}   

//dispatch is to signal events
let randomNumCoins = randomBetween(1,5);
let numCoins = randomNumCoins;

const Physics = (entities, { touches, time, dispatch }) => {
    let engine = entities.physics.engine;
    let world = entities.physics.world;
    let scepter = entities.scepter.body;
    
    let coinsGenerated = false;
    let noCoins = false;

    let hadTouches = false;
    touches.filter(t => t.type === "press").forEach(t => {
        if (!hadTouches){
            if (world.gravity.y === 0.0){
                world.gravity.y = 1;
                dispatch( {type: "closeMainMenu"});

                addPipesAtLocation((Constants.MAX_WIDTH * 2)- (Constants.PIPE_WIDTH / 2), world, entities);
                addPipesAtLocation((Constants.MAX_WIDTH * 3)- (Constants.PIPE_WIDTH / 2), world, entities);
               
                
                // console.log(entities["pipe1"].body.position.y)
                generateCoins(randomNumCoins, pipe2Y, pipe1Y, (Constants.MAX_WIDTH * 2)- (Constants.PIPE_WIDTH / 2), world, entities);
                coinsGenerated = true;
            }
            hadTouches = false;
            Matter.Body.setVelocity(scepter, 
                { x: scepter.velocity.x, y: -11 }); 
        }
        
    });


    Matter.Engine.update(engine, time.delta);

    Object.keys(entities).forEach(key => {
        //ownproperty checks if its new unique pipe so there isnt old stuff there
        
        if(key.indexOf("pipe") === 0 && entities.hasOwnProperty(key)){
            Matter.Body.translate(entities[key].body, {x: -5, y: 0});
                
            if (key.indexOf("Top") !== -1 && parseInt(key.replace("pipe", "")) % 2 === 0){

                if (entities[key].body.position.x <= scepter.position.x && !entities[key].scored){
                    entities[key].scored = true;
                    dispatch({ type: "score"});
                }


                if (entities[key].body.position.x <= -1 * (Constants.PIPE_WIDTH / 2)){
                    let pipeIndex = parseInt(key.replace("pipe", ""))
                    delete(entities["pipe" + (pipeIndex -1) + "Top"])
                    delete(entities["pipe" + (pipeIndex -1)])
                    delete(entities["pipe" + pipeIndex + "Top"])
                    delete(entities["pipe" + pipeIndex])

                    addPipesAtLocation((Constants.MAX_WIDTH * 2)- (Constants.PIPE_WIDTH / 2), world, entities);
                   
                    // if (noCoins && typeof entities["pipe2"].body !== 'undefined' && typeof entities["pipe1"].body !== 'undefined'){
                    //     generateCoins(randomNumCoins,entities["pipe2"].body.position.y, entities["pipe1"].body.position.y, (Constants.MAX_WIDTH * 2)- (Constants.PIPE_WIDTH / 2), world, entities);
                    //     noCoins = false;
                    // }
                }
            }

        } else if (key.indexOf("coin") === 0 && entities.hasOwnProperty(key)){
            // if(randomBetween(0,10) <= 3 && !coinsGenerated){
            Matter.Body.translate(entities[key].body, {x: -5, y: 0});
            // if(coinsDelete === true){
            //     for(i=0; i<=numCoins; i++){
            //         if(entities["coin" + i] !== undefined){
            //             delete(entities["coin" + i])
            //         }
            //     }
            //     randomNumCoins = 0;
            //     numCoins = 0;
            // }
            if (checkPointInRadius(scepter.position.x, scepter.position.y, entities[key].body.position.x, entities[key].body.position.y, 40))
            {
                // Matter.Body.applyForce(entities[key].body, {x: entities[key].body.position.x, y: entities[key].body.position.y}, {x: 50, y: 100})
                Matter.Body.translate(entities[key].body, {x: Constants.MAX_WIDTH, y: 0});
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) 
                dispatch({ type: "coinScore"});
                console.log("at same spot");
            }

            if (entities[key].body.position.x <= -1 * (Constants.COIN_WIDTH /2)){
                let coinNumToDelete = parseInt(key.replace("coin", ""))
                console.log("Coin Number Deleted " + coinNumToDelete)
                delete(entities["coin" + coinNumToDelete])
                randomNumCoins -= 1;
                // if(typeof entities["pipe2"].body !== 'undefined' && typeof entities["pipe1"].body !== 'undefined'){

                // } 
                // else{
                //     noCoins = true;
                // }
            }
            if (randomNumCoins === 0){
                randomNumCoins = randomBetween(1,5);
                numCoins = randomNumCoins;
                generateCoins(randomNumCoins,pipe2Y, pipe1Y, (Constants.MAX_WIDTH * 2)- (Constants.PIPE_WIDTH / 2), world, entities); 
            }    
            // }
        }
        else if (key.indexOf("floor") === 0){
            if (entities[key].body.position.x <= -1 * Constants.MAX_WIDTH / 2){
                Matter.Body.setPosition(entities[key].body, {x: Constants.MAX_WIDTH + (Constants.MAX_WIDTH / 2.1), y: entities[key].body.position.y})
            } //if center of floor is halfwya ooff screen
            else{
                Matter.Body.translate(entities[key].body, {x: -5, y: 0});
            }
        }
    })
    

    tick += 1;
    if (tick % 5 === 0){
        pose = pose + 1;
        coinPose = coinPose + 1;
        if (pose > 12){
            pose = 1;
        }
        if (coinPose > 10){
            coinPose = 1;
        }
        entities.scepter.pose = pose;
        Object.keys(entities).forEach(key => {
            if (key.indexOf("coin") === 0 && entities.hasOwnProperty(key)){
                for(i=0; i<=numCoins; i++){
                     if(entities["coin" + i] !== undefined){
                         entities["coin" + i].pose = coinPose;
                     }
                }
                
            }
        });
    }

    return entities;
}

export default Physics;