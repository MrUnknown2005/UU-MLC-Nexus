import logo from '../../assets/club-logo.png';

function SafeImage({ src, alt = "", className = "" }) {
  return (
    <img
      src={src || logo}
      alt={alt}
      className={className}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = logo;
      }}
    />
  );
}


export default SafeImage;
