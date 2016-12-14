module IrrelevantMultiArg exposing (..)


type Asset
    = AssetPair String String
    | AssetPath String


complexAsset =
    AssetPair "elm_logo.svg" "elm_logo.svg"


partialAsset =
    AssetPair "elm_logo.svg"


simpleAsset =
    AssetPath "elm_logo.svg"
