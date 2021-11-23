from django.contrib.auth.models import User
from django.core.exceptions import ViewDoesNotExist, ObjectDoesNotExist, FieldError
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout

# HOME PAGE, must authenticate first
# If the user is not authenticated, "login.html" template will be rendered.
# If the user was authenticated (passed the login page). "home.html" will be rendered
def home_page(request, checkin_success=False):
    try:
        admin = False
        if not request.user.is_authenticated:
            return render(request, "../templates/login.html")
        if request.user.is_staff:
            admin = True
        return render(request, "../templates/home.html")
    except Exception as e:
        return render(request, "../templates/err_404.html", {'message': e})


# This function processes a login_request. If successful a redirection to the home_page view will occur
# If not successful "login.html" will be reloaded with an error.
def login_request(request):
    try:
        username = request.POST['username']
        password = request.POST['password']
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return render(request, "../templates/login.html", {'login_error': "Username was not found"})


        # Authenticate is a builtin django function
        if user.is_active:
            user_auth = authenticate(request, username=username, password=password)

        # If successful redirect to home_page view. Otherwise show the login page again with error
        if user_auth is not None:
            login(request, user)
            return redirect(home_page)
    except Exception as e:
        return render(request, "../templates/err_404.html", {'message': e})


def go_to_class(request):
    try:
        message = "ADD YER STUFF"
        return render(request, "../templates/go_to_class.html", {'message': message});

    except Exception as e:
        return render(request, "../templates/err_404.html", {'message': e})