module NoArg exposing (assetPath, main)


assetPath =
    -- this gets compiled to variable assignment
    "star.png"


main : Program () String msg
main =
    Platform.worker
        { init = \_ -> ( assetPath, Cmd.none )
        , update = \_ m -> ( m, Cmd.none )
        , subscriptions = always Sub.none
        }
