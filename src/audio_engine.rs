use std::collections::HashMap;
use std::fs::File;
use std::io::BufReader;
use std::time::Duration;
use rodio::{Decoder, MixerDeviceSink, Source, SpatialPlayer};
use anyhow::{Error, Result};

pub struct AudioEngine {
    mixer_sink: MixerDeviceSink,
    sounds: HashMap<String, SpatialPlayer>,
}

const LEFT_EAR: [f32; 3] = [-1.0, 0.0, 0.0];
const RIGHT_EAR: [f32; 3] = [1.0, 0.0, 0.0];

impl AudioEngine {
    pub fn new() -> Result<Self> {
        match rodio::DeviceSinkBuilder::open_default_sink() {
            Ok(mixer_sink) => Ok(Self {
                mixer_sink,
                sounds: HashMap::new()
            }),
            Err(e) => Err(Error::from(e))
        }
    }
    
    fn play_file(&mut self, id: &str, path: &str, pan: Option<f32>, fade_in: Option<u64>) -> Result<()> {
        let file = File::open(path)?;
        let source = Decoder::new(BufReader::new(file))?
            .fade_in(Duration::from_millis(fade_in.unwrap_or(1)));

        let player = SpatialPlayer::connect_new(
            &self.mixer_sink.mixer(),
            [pan.unwrap_or(0.0), 0.0, 0.0],
            LEFT_EAR,
            RIGHT_EAR,
        );

        player.append(source);
        player.play();

        self.sounds.insert(String::from(id), player);

        Ok(())
    }

    pub fn play(&mut self) -> Result<()> {
        self.play_file("1", "sounds/loop_1.mp3", Some(-1.0), Some(15_000))
    }

    pub fn play_other(&mut self) -> Result<()> {
        self.play_file("2", "sounds/drone_1.wav", Some(1.0), None)
    }

    pub fn stop_all(&self) {
        self.sounds.values().filter(|&p| !p.is_paused()).for_each(|p| p.stop())
    }
}