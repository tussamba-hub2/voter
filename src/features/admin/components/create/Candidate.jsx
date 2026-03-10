import React, { useState } from "react";
import supabase from "../../../../lib/supabaseClient";

export default function Candidate() {
  const [name, setName] = useState("");
  const [cabinet, setCabinet] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    setPhotoFile(f);
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowSuccessNotification(false);
    setShowErrorNotification(false);
    setErrorMessage("");

    if (!name.trim() || !cabinet.trim()) {
      setErrorMessage("Nome e gabinete são obrigatórios.");
      setShowErrorNotification(true);
      return;
    }

    setLoading(true);
    try {
      let foto_url = null;
      if (photoFile) {
        foto_url = await uploadImage(photoFile);
      }

      const { data, error } = await supabase
        .from("candidatos")
        .insert([{ nome: name.trim(), gabinete: cabinet.trim(), foto_url }]);

      if (error) throw error;

      setShowSuccessNotification(true);
      setName("");
      setCabinet("");
      setPhotoFile(null);
      // reset file input value
      const inputEl = document.getElementById("photo");
      if (inputEl) inputEl.value = null;
    } catch (err) {
      setErrorMessage(err.message || "Erro ao registar candidato.");
      setShowErrorNotification(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="abs-container-shade d-flex items-center justify-center">
      <div className="min-form">
        <form onSubmit={handleSubmit}>
          <div className="grid-three p-16 br-bt">
            <button
              type="button"
              className="d-flex justify-start items-center"
              onClick={() => {
                setName("");
                setCabinet("");
                setPhotoFile(null);
                const inputEl = document.getElementById("photo");
                if (inputEl) inputEl.value = null;
              }}
            >
              <span className="color-primary">Cancelar</span>
            </button>
            <span className="color-opac">Novo candidato</span>
            <button
              type="submit"
              className="d-flex items-center justify-end"
              disabled={loading}
            >
              <span className="bold color-primary">
                {loading ? "A registar..." : "Registar"}
              </span>
            </button>
          </div>

          <div className="p-16 d-flex column g-20px">
            {showSuccessNotification && (
              <div className="some-notification success-notification">
                <div className="d-flex items-center g-12px">
                  <i className="fi fi-sr-check-circle"></i>
                  <span className="super-bold nowrap">
                    Candidato registado com sucesso
                  </span>
                </div>
              </div>
            )}

            {showErrorNotification && (
              <div className="some-notification error-notification">
                <div className="d-flex items-center g-12px">
                  <i className="fi fi-sr-bug"></i>
                  <span className="super-bold nowrap">{errorMessage}</span>
                </div>
              </div>
            )}

            <div className="d-flex column g-8px">
              <label htmlFor="name" className="color-opac">
                Nome do candidato
              </label>
              <input
                type="text"
                id="name"
                className="input"
                placeholder="Anibal Kiombo"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="d-flex column g-8px">
              <label htmlFor="cabinet" className="color-opac">
                Gabinete
              </label>

              <select
                id="cabinet"
                className="select"
                value={cabinet}
                onChange={(e) => setCabinet(e.target.value)}
              >
                <option value="">Selecionar gabinete</option>

                <option value="GPDEI">GPDEI</option>
                <option value="GPJD">GPJD</option>
                <option value="Transportes">Transportes</option>
                <option value="GASFIG">GASFIG</option>
                <option value="GPIST">GPIST</option>
                <option value="GPAGRSCU">GPAGRSCU</option>
                <option value="GPU">GPU</option>
              </select>
            </div>

            <div className="d-flex column g-8px">
              <label htmlFor="photo" className="color-opac">
                Selecionar foto
              </label>
              <input
                type="file"
                id="photo"
                className="input"
                accept=".png, .jpg, .jpeg, .heic"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
