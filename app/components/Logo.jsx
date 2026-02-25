export default function Logo({ className }) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={className}
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
        >
            <polygon points="50,10 28.5,50 71.5,50" />
            <polygon points="25,56 3.5,96 46.5,96" />
            <polygon points="75,56 53.5,96 96.5,96" />
        </svg>
    );
}
