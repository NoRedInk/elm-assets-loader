module VariableCall exposing (..)


type Asset
    = VariableCallAsset String


type AssetKind
    = Star
    | Moon


asset kind =
    let
        filename =
            case kind of
                Star ->
                    "star.png"

                Moon ->
                    "moon.png"
    in
        VariableCallAsset filename
