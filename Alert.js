import React, { useState } from "react";
import { View, StyleSheet, Button, Alert } from "react-native";

  const CoinsAlert = () =>
    Alert.alert(
      "Scepter Dash",
      "50 Coins Received!",
      [
        { text: "Return To Game", onPress: () => console.log("OK Pressed") }
      ],
      { cancelable: false }
    );

export default CoinsAlert;