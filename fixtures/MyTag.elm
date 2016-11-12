module MyTag exposing (..)

import OtherTag


type Asset
    = Asset String


otherTagAsset =
    OtherTag.Asset "dont_touch_me.png"


myAsset =
    Asset "elm_logo.svg"
