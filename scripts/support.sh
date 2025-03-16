TF="%E seconds"
hasProblem=$(mktemp /tmp/stellar-contracts.hasProblem.XXXXXX)

TEMP_FILES=()
# Cleanup function to remove all temporary files
cleanup() {
    for file in "${TEMP_FILES[@]}"; do
        rm -f $file
    done
    rm -f $hasProblem
}

WITHDOCS=${DOCS:-1}
withDocs() {
    [[ $WITHDOCS -eq 0 ]] || $*
}

ESBUILD_EXTERNALS=$(cat <<EOF
--external:esbuild 
--external:rollup 
--external:rollup-plugin-esbuild 
--external:rollup-pluginutils 
--external:@helios-lang
EOF
)
ESBUILD="esbuild --format=esm --bundle --sourcemap --packages=external"

makeRollupPlugin() {
    WATCH=${1:-}
    $ESBUILD $WATCH --platform=node $ESBUILD_EXTERNALS \
        --drop-labels=__BROWSER_ONLY__ \
        --outfile=dist/rollup-plugins.mjs \
        index-rollup-plugins.ts || {
            logProblemWith "rollup plugin"
        }

    # raw DTS to be fed to api-extractor 
    inBackground "updating rollup-plugin.d.ts..." \
        rollupPluginDTS  &
} 


rollupPluginDTS() {
    # stage 1: raw DTS to be fed to api-extractor
    tsc -p ./tsconfig.rollupPlugins.dts.json  &&
    withDocs api-extractor run --local -c api-extractor.rollupPlugins.json 
    # .d.ts only for now (do we need separate docs?)
    # stage 2: api extractor brings it all together
    # only if WITHDOCS isn't 0
}


# Set trap to call cleanup function on script exit or interruption
trap cleanup EXIT INT TERM

WARNED_NOSOUND=0
if [[ "${STC_SOUND:-1}" -eq 0 ]]; then
    WARNED_NOSOUND=1
fi

SOUND_DIR=${STC_SOUND_DIR:-/usr/share/sounds/gnome/default/alerts/}

PROJECT_PITCH=${STC_PROJECT_PITCH:--407}
SOX_OPTS=${STC_SOX_OPTS:---buffer 131072 --multi-threaded}
playSound() {
    if [[ ${STC_SOUND:-1} -eq 0 ]]; then
        return
    fi
    f=$1
    shift
    SFILE=${SOUND_DIR}$f.ogg
    if [[ -f $SFILE ]]; then
        timeout --signal TERM 1s play $SFILE $* > /dev/null 2>&1 || {
            echo "" # silent failure after one retry
        }
    else 
        if [ $WARNED_NOSOUND -eq 0 ]; then
            echo "No sound file ${f}.ogg found in $SOUND_DIR"
            echo "  (not a linux system? Or sound files are in a different location?)"
            echo "  (provide STC_SOUND_DIR, or STC_SOUND=0 to disable sound effects)"

            WARNED_NOSOUND=1
        fi
    fi
}

playStartSound() {
    # this sound needs extra pitch-shift to be distinct
    playSound swing pitch $PROJECT_PITCH pitch $PROJECT_PITCH 
}

playErrorSound() {
    playSound hum vol 0.5 pitch $PROJECT_PITCH 
}

playProgressSound() {
    playSound click pitch $PROJECT_PITCH phaser 0.6 0.66 2 0.4 2 -t 
}

playCheckpointSound() {
    playSound string pitch $PROJECT_PITCH tempo 1.4 &
    sleep 0.15
    playSound string pitch $PROJECT_PITCH pitch 407 tempo 2.8 
    wait
}

playSuccessSound() {
        # audio indication of success
    playSound string pitch $PROJECT_PITCH tempo 0.7 &
    sleep 0.1 
    playSound string pitch $PROJECT_PITCH pitch 407 tempo 0.7 &
    playSound string pitch $PROJECT_PITCH pitch -182 tempo 0.8 &
    sleep 0.25 
    playSound string vol 1.5 pitch $PROJECT_PITCH pitch 1200 tempo 2
    wait
}

exitIfError() {
    if [ -s $hasProblem ]; then
        # audio indication of failure, and exit
        playErrorSound
        echo "build failed in jobs:" >&2
        cat $hasProblem | while read line; do
            echo "  $line" >&2
        done
        exit 42
    fi
}

logProblemWith() {
    echo "$1" >> $hasProblem
}

# limits the window in which background jobs can stomp
# on each others' output and mess up the terminal
inBackground() {
    # creates two tempfiles (stdout/stderr), and runs the command in the background.
    # when the background job finishes, the content is emitted and 
    # the tempfiles are removed.
    local outFile=$(mktemp /tmp/stellar-contracts.stdout.XXXXXX)
    local errFile=$(mktemp /tmp/stellar-contracts.stdout.XXXXXX)

    # add tempfiles to list for cleanup
    TEMP_FILES+=($outFile $errFile)

    DESCR=$1
    shift
    echo "  -- in background: $DESCR"
    export TIMEFORMAT="  -- ${DESCR}: ${TF}" 
    time $* > $outFile 2> $errFile &

    local pid=$!
    MAYBE_WITH_ERRORS=""
    wait $pid || {
        MAYBE_WITH_ERRORS=" with error code $?"
        logProblemWith "$DESCR"
    }
    cat $outFile
    cat $errFile >&2
    rm $outFile $errFile
    [[ -z $MAYBE_WITH_ERRORS ]] && playProgressSound
    echo "  -- done${MAYBE_WITH_ERRORS}: $DESCR"
}

