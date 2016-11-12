module MyMaybe exposing (..)

import Maybe


type MyMaybe a
    = Just a
    | MyNothing


coreJust =
    Maybe.Just "dont_touch_me.png"


myJust =
    Just "elm_logo.svg"
