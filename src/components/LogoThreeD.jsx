import Spline from '@splinetool/react-spline';

const LogoThreeD = () => {
  return (
        <div className="relative w-full h-[25rem]"> {/* set desired height */}
        <Spline scene="https://prod.spline.design/hTSfT9RtUX01UIAg/scene.splinecode" className="absolute inset-0 w-full h-full" />
        <p className="absolute bottom-5 right-4 bg-gray-900 px-4 py-2 text-black rounded-md shadow">
            Made With 💖
        </p>
        </div>

  )
}

export default LogoThreeD