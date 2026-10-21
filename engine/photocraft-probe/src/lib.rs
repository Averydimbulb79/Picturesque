//! Isolated compatibility probe, never loaded by the production editor.
#![forbid(unsafe_code)]
use photocraft_doc::{Color, ColorMode, Document, SampleType, Size};
use wasm_bindgen::prelude::*;

fn pixels(width: u32, height: u32) -> Result<Vec<u8>, String> {
    // A deliberately small synthetic image, not a user-project importer.
    if width == 0 || height == 0 || width > 512 || height > 512 {
        return Err("Probe dimensions must be between 1 and 512".into());
    }
    let doc = Document::with_background(
        "Picturesque probe", Size::new(width, height),
        ColorMode::Rgb, SampleType::U8, Color::rgb(1.0, 0.0, 0.0),
    );
    Ok(photocraft_compose::flatten(&doc).to_rgba8().pixels)
}

#[wasm_bindgen]
pub fn render_probe(width: u32, height: u32) -> Result<Vec<u8>, JsValue> {
    pixels(width, height).map_err(|error| JsValue::from_str(&error))
}

#[cfg(test)]
mod tests {
    use super::pixels;

    #[test]
    fn composites_known_pixels() {
        let result = pixels(2, 2).expect("synthetic document");
        assert_eq!(result, [255, 0, 0, 255].repeat(4));
    }

    #[test]
    fn rejects_invalid_dimensions_before_allocating() {
        for size in [(0, 1), (1, 0), (513, 1), (u32::MAX, u32::MAX)] {
            assert!(pixels(size.0, size.1).is_err());
        }
    }
}
